import { Inject, Injectable } from '@nestjs/common';
import {
  DAILY_FOCUS_CAP_SECONDS,
  QUALIFIED_DAY_MINUTES,
} from '@nezfocus/shared';
import { and, asc, between, eq, gte, inArray, sql } from 'drizzle-orm';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import { channels, serverMembers, servers } from '../servers/servers.schema.js';
import { userSettings } from '../users/users.schema.js';
import { focusSessionParticipations, focusSessions } from './focus.schema.js';
import {
  creditFocus,
  type DayCredit,
  type FocusInterval,
  localDate,
} from './focused-time.js';
import { streakRun, type StoredStreak } from './streak.js';
import { soloSessions } from './solo.schema.js';
import { dailyStudyStats, userStudyStreaks } from './study.schema.js';

export type FocusCredit = {
  userId: bigint;
  intervals: FocusInterval[];
  source: 'solo' | 'room';
};

// REQ-STUDY-15: the one place focus time reaches daily_study_stats.
@Injectable()
export class StudyStatsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Pass the caller's transaction to commit together with its session row (savepoint).
  credit(
    input: FocusCredit,
    executor: Db | Tx = this.db,
  ): Promise<DayCredit[]> {
    return executor.transaction(async (tx) => {
      // Locking the settings row serialises credits per user, so the cap holds under races.
      const [settings] = await tx
        .select({ timezone: userSettings.timezone })
        .from(userSettings)
        .where(eq(userSettings.userId, input.userId))
        .for('update');
      if (!settings) throw new Error(`no user_settings for ${input.userId}`);
      const { timezone } = settings;

      const dates = creditFocus(input.intervals, timezone, {}).map(
        (c) => c.localDate,
      );
      if (dates.length === 0) return [];
      const existing = await tx
        .select({
          localDate: dailyStudyStats.localDate,
          focusedSeconds: dailyStudyStats.focusedSeconds,
        })
        .from(dailyStudyStats)
        .where(
          and(
            eq(dailyStudyStats.userId, input.userId),
            inArray(dailyStudyStats.localDate, dates),
          ),
        );
      const credits = creditFocus(
        input.intervals,
        timezone,
        Object.fromEntries(
          existing.map((r) => [r.localDate, r.focusedSeconds]),
        ),
      );

      const solo = input.source === 'solo';
      for (const { localDate, seconds } of credits) {
        if (seconds === 0) continue;
        await tx
          .insert(dailyStudyStats)
          .values({
            userId: input.userId,
            localDate,
            timezone,
            focusedSeconds: seconds,
            soloSeconds: solo ? seconds : 0,
          })
          .onConflictDoUpdate({
            target: [dailyStudyStats.userId, dailyStudyStats.localDate],
            set: {
              // REQ-STUDY-15 (4): LEAST keeps the CHECK even if a caller skipped the cap; solo takes the same clipped delta.
              focusedSeconds: sql`LEAST(${dailyStudyStats.focusedSeconds} + ${seconds}, ${DAILY_FOCUS_CAP_SECONDS})`,
              soloSeconds: solo
                ? sql`${dailyStudyStats.soloSeconds} + LEAST(${seconds}, ${DAILY_FOCUS_CAP_SECONDS} - ${dailyStudyStats.focusedSeconds})`
                : dailyStudyStats.soloSeconds,
            },
          });
      }
      await this.saveStreak(tx, input.userId);
      return credits;
    });
  }

  // DEC-24: recomputed in the credit transaction, so the streak rises the moment a day reaches 15 minutes.
  // ponytail: reads every Qualified Day of the user per credit; keep a running count if users reach thousands of days.
  private async saveStreak(tx: Tx, userId: bigint) {
    const rows = await tx
      .select({ localDate: dailyStudyStats.localDate })
      .from(dailyStudyStats)
      .where(
        and(
          eq(dailyStudyStats.userId, userId),
          gte(dailyStudyStats.focusedSeconds, QUALIFIED_DAY_MINUTES * 60),
        ),
      )
      .orderBy(asc(dailyStudyStats.localDate));
    const run = streakRun(rows.map((r) => r.localDate));
    const values = {
      currentStreakDays: run.current,
      longestStreakDays: run.longest,
      lastQualifiedDate: run.last,
    };
    await tx
      .insert(userStudyStreaks)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: userStudyStreaks.userId,
        set: {
          ...values,
          longestStreakDays: sql`GREATEST(${userStudyStreaks.longestStreakDays}, ${run.longest})`,
        },
      });
  }

  // Today as the user's time zone has it, the stored run, and today's seconds.
  async timezoneOf(userId: bigint) {
    const [settings] = await this.db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    if (!settings) throw new Error(`no user_settings for ${userId}`);
    return settings.timezone;
  }

  async streakSnapshot(userId: bigint, now: Date) {
    const timezone = await this.timezoneOf(userId);
    const today = localDate(now.getTime(), timezone);
    const [streak] = await this.db
      .select()
      .from(userStudyStreaks)
      .where(eq(userStudyStreaks.userId, userId));
    const [day] = await this.db
      .select({ focusedSeconds: dailyStudyStats.focusedSeconds })
      .from(dailyStudyStats)
      .where(
        and(
          eq(dailyStudyStats.userId, userId),
          eq(dailyStudyStats.localDate, today),
        ),
      );
    const stored: StoredStreak = {
      current: streak?.currentStreakDays ?? 0,
      longest: streak?.longestStreakDays ?? 0,
      last: streak?.lastQualifiedDate ?? null,
    };
    return { timezone, today, stored, todaySeconds: day?.focusedSeconds ?? 0 };
  }

  days(userId: bigint, from: string, to: string) {
    return this.db
      .select({
        localDate: dailyStudyStats.localDate,
        focusedSeconds: dailyStudyStats.focusedSeconds,
        soloSeconds: dailyStudyStats.soloSeconds,
      })
      .from(dailyStudyStats)
      .where(
        and(
          eq(dailyStudyStats.userId, userId),
          between(dailyStudyStats.localDate, from, to),
        ),
      );
  }

  // Minutes are rounded down per day, like the columns, so "Từ trước tới nay" adds up with them.
  async allTime(userId: bigint) {
    const [row] = await this.db
      .select({
        minutes: sql<number>`coalesce(sum(${dailyStudyStats.focusedSeconds} / 60), 0)::int`,
        firstDate: sql<
          string | null
        >`min(${dailyStudyStats.localDate}) filter (where ${dailyStudyStats.focusedSeconds} >= 60)`,
      })
      .from(dailyStudyStats)
      .where(eq(dailyStudyStats.userId, userId));
    return { minutes: row?.minutes ?? 0, firstDate: row?.firstDate ?? null };
  }

  // REQ-STUDY-17 history: one row per Solo Session and per Room Session (re-joins merged),
  // running first, then newest; filtered on the local date of the start.
  async history(q: {
    userId: bigint;
    timezone: string;
    from?: string;
    to?: string;
    cursor?: HistoryCursor;
    limit: number;
  }): Promise<HistoryRow[]> {
    const solo = this.db
      .select({
        id: soloSessions.id,
        kind: sql<'solo' | 'room'>`'solo'`.as('kind'),
        channelId: sql<bigint | null>`null::bigint`.as('channel_id'),
        serverId: sql<bigint | null>`null::bigint`.as('server_id'),
        startedAt: soloSessions.startedAt,
        endedAt: soloSessions.endedAt,
        joinCount: sql<number>`1`.as('join_count'),
        focusedSeconds: soloSessions.focusedSeconds,
        creditedDays: soloSessions.creditedDays,
      })
      .from(soloSessions)
      .where(eq(soloSessions.userId, q.userId));
    const room = this.db
      .select({
        id: focusSessions.id,
        kind: sql<'solo' | 'room'>`'room'`.as('kind'),
        channelId: sql<bigint | null>`${focusSessions.channelId}`.as(
          'channel_id',
        ),
        serverId: sql<bigint | null>`${focusSessions.serverId}`.as('server_id'),
        startedAt: sql<Date>`min(${focusSessionParticipations.joinedAt})`.as(
          'started_at',
        ),
        endedAt:
          sql<Date | null>`case when bool_or(${focusSessionParticipations.leftAt} is null) then null else max(${focusSessionParticipations.leftAt}) end`.as(
            'ended_at',
          ),
        joinCount: sql<number>`count(*)::int`.as('join_count'),
        focusedSeconds:
          sql<number>`sum(${focusSessionParticipations.focusedSeconds})::int`.as(
            'focused_seconds',
          ),
        creditedDays: sql<Record<string, number>>`'{}'::jsonb`.as(
          'credited_days',
        ),
      })
      .from(focusSessionParticipations)
      .innerJoin(
        focusSessions,
        eq(focusSessions.id, focusSessionParticipations.focusSessionId),
      )
      .where(eq(focusSessionParticipations.userId, q.userId))
      .groupBy(focusSessions.id);
    const rows = solo.unionAll(room).as('rows');

    const running = sql`(${rows.endedAt} is null)::int`;
    const micros = sql`(extract(epoch from ${rows.startedAt}) * 1000000)::bigint`;
    const localStart = sql`(${rows.startedAt} at time zone ${q.timezone})::date`;
    const c = q.cursor;
    const result = await this.db
      .select({
        id: rows.id,
        kind: rows.kind,
        channelId: rows.channelId,
        serverId: rows.serverId,
        startedAt: rows.startedAt,
        endedAt: rows.endedAt,
        joinCount: rows.joinCount,
        focusedSeconds: rows.focusedSeconds,
        creditedDays: rows.creditedDays,
        micros: sql<string>`${micros}`,
      })
      .from(rows)
      .where(
        and(
          // 0 seconds never make a row; a running session always shows.
          sql`(${rows.focusedSeconds} > 0 or ${rows.endedAt} is null)`,
          q.from ? sql`${localStart} >= ${q.from}::date` : undefined,
          q.to ? sql`${localStart} <= ${q.to}::date` : undefined,
          c
            ? sql`(${running}, ${micros}, ${rows.id}) < (${c.running}, ${c.micros}::bigint, ${c.id}::bigint)`
            : undefined,
        ),
      )
      .orderBy(sql`${running} desc, ${micros} desc, ${rows.id} desc`)
      .limit(q.limit);
    return result.map((r) => ({
      ...r,
      startedAt: new Date(r.startedAt),
      endedAt: r.endedAt && new Date(r.endedAt),
      channelId: r.channelId === null ? null : BigInt(r.channelId),
      serverId: r.serverId === null ? null : BigInt(r.serverId),
      micros: BigInt(r.micros),
    }));
  }

  // What the user may know today about each room of their history (REQ-STUDY-17 AC5).
  roomsOf(userId: bigint, channelIds: bigint[]) {
    if (channelIds.length === 0) return Promise.resolve([]);
    return this.db
      .select({
        channelId: channels.id,
        channelName: channels.name,
        deleted: sql<boolean>`${channels.deletedAt} is not null`,
        serverName: servers.name,
        member: sql<boolean>`${serverMembers.userId} is not null`,
      })
      .from(channels)
      .innerJoin(servers, eq(servers.id, channels.serverId))
      .leftJoin(
        serverMembers,
        and(
          eq(serverMembers.serverId, channels.serverId),
          eq(serverMembers.userId, userId),
        ),
      )
      .where(inArray(channels.id, channelIds));
  }
}

export type HistoryCursor = { running: number; micros: bigint; id: bigint };
export type HistoryRow = {
  id: bigint;
  kind: 'solo' | 'room';
  channelId: bigint | null;
  serverId: bigint | null;
  startedAt: Date;
  endedAt: Date | null;
  joinCount: number;
  focusedSeconds: number;
  creditedDays: Record<string, number>;
  micros: bigint;
};
