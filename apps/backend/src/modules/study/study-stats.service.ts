import { Injectable } from '@nestjs/common';
import {
  addDays,
  ErrorCode,
  Permission,
  periodOf,
  previousPeriod,
  type SessionRoom,
  type StudySessionsQuery,
  type StudySessionsResponse,
  type StudyStatsQuery,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { PermissionService } from '../permissions/permission.service.js';
import { localDate } from './focused-time.js';
import { StreakService } from './streak.service.js';
import {
  StudyStatsRepository,
  type HistoryCursor,
  type HistoryRow,
} from './study-stats.repository.js';

const minutes = (seconds: number) => Math.floor(seconds / 60);

const GONE: SessionRoom = {
  access: 'gone',
  channel_name: null,
  server_name: null,
};

// Opaque to the app: "<running>_<start µs>_<id>" of the last row of a page.
const encodeCursor = (r: HistoryRow) =>
  `${r.endedAt === null ? 1 : 0}_${r.micros}_${r.id}`;
const decodeCursor = (s: string): HistoryCursor => {
  const m = /^([01])_(\d{1,20})_(\d{1,20})$/.exec(s);
  if (!m)
    throw new AppError(ErrorCode.ValidationError, 'Invalid request', {
      before: [{ code: 'INVALID_CURSOR', message: 'unknown cursor' }],
    });
  return { running: Number(m[1]), micros: BigInt(m[2]!), id: BigInt(m[3]!) };
};

// REQ-STUDY-17: the user's own numbers, per local day of user_settings.timezone.
@Injectable()
export class StudyStatsService {
  constructor(
    private readonly repo: StudyStatsRepository,
    private readonly streaks: StreakService,
    private readonly permissions: PermissionService,
  ) {}

  async stats(userId: bigint, q: StudyStatsQuery): Promise<StudyStatsResponse> {
    const { streak, timezone, today } = await this.streaks.state(userId);
    const period = periodOf(q.view, q.date ?? today);
    const prev = previousPeriod(q.view, period, today);
    const [rows, allTime] = await Promise.all([
      this.repo.days(userId, prev.from, period.to),
      this.repo.allTime(userId),
    ]);
    const byDate = new Map(rows.map((r) => [r.localDate, r]));

    const days: StudyStatsResponse['days'] = [];
    for (let d = period.from; d <= period.to; d = addDays(d, 1)) {
      const r = byDate.get(d);
      days.push({
        local_date: d,
        focused_minutes: minutes(r?.focusedSeconds ?? 0),
        solo_minutes: minutes(r?.soloSeconds ?? 0),
      });
    }
    const total = days.reduce((n, d) => n + d.focused_minutes, 0);
    const solo = days.reduce((n, d) => n + d.solo_minutes, 0);
    const previous = rows
      .filter((r) => r.localDate >= prev.from && r.localDate <= prev.to)
      .reduce((n, r) => n + minutes(r.focusedSeconds), 0);

    return {
      ...streak,
      view: q.view,
      timezone,
      today,
      from: period.from,
      to: period.to,
      days,
      total_minutes: total,
      room_minutes: total - solo,
      solo_minutes: solo,
      previous_minutes: previous,
      all_time_minutes: allTime.minutes,
      first_date: allTime.firstDate,
    };
  }

  async sessions(
    userId: bigint,
    q: StudySessionsQuery,
  ): Promise<StudySessionsResponse> {
    const timezone = await this.repo.timezoneOf(userId);
    const rows = await this.repo.history({
      userId,
      timezone,
      from: q.from,
      to: q.to,
      cursor: q.before ? decodeCursor(q.before) : undefined,
      limit: q.limit + 1,
    });
    const page = rows.slice(0, q.limit);
    const rooms = await this.rooms(
      userId,
      page.flatMap((r) => (r.channelId === null ? [] : [r.channelId])),
    );

    return {
      study_sessions: page.map((r) => ({
        id: String(r.id),
        kind: r.kind,
        room: r.channelId === null ? null : (rooms.get(r.channelId) ?? GONE),
        started_at: r.startedAt.toISOString(),
        ended_at: r.endedAt?.toISOString() ?? null,
        join_count: r.joinCount,
        focused_seconds: r.focusedSeconds,
        days:
          r.kind === 'solo'
            ? Object.entries(r.creditedDays)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([local_date, focused_seconds]) => ({
                  local_date,
                  focused_seconds,
                }))
            : // ponytail: Participations keep no per-day split yet; P3-B3 (#28) credits them per local day like Solo.
              [
                {
                  local_date: localDate(r.startedAt.getTime(), timezone),
                  focused_seconds: r.focusedSeconds,
                },
              ],
      })),
      next_cursor:
        rows.length > q.limit ? encodeCursor(page[page.length - 1]!) : null,
    };
  }

  // REQ-STUDY-17 AC5: names follow what the user may see today.
  private async rooms(userId: bigint, channelIds: bigint[]) {
    const out = new Map<bigint, SessionRoom>();
    for (const c of await this.repo.roomsOf(userId, [...new Set(channelIds)])) {
      const access: SessionRoom['access'] = !c.member
        ? 'gone'
        : c.deleted
          ? 'deleted'
          : (await this.permissions.can(
                userId,
                { channelId: c.channelId },
                Permission.VIEW_CHANNEL,
              ))
            ? 'visible'
            : 'hidden';
      out.set(c.channelId, {
        access,
        channel_name: access === 'visible' ? c.channelName : null,
        server_name: access === 'gone' ? null : c.serverName,
      });
    }
    return out;
  }
}
