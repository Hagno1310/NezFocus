import { isDeepStrictEqual } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import {
  ErrorCode,
  SOLO_WAIT_LIMIT_MS,
  type CurrentSoloSessionResponse,
  type CycleConfig,
  type SoloAction,
  type SoloSession,
  type SoloSessionResponse,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { isUniqueViolation } from '../../common/db-errors.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import {
  advance,
  applyAction,
  startSolo,
  type SoloState,
  type SoloStep,
} from './solo-machine.js';
import {
  SoloSessionRepository,
  type SoloRecord,
} from './solo-session.repository.js';
import { StudyStatsRepository } from './study-stats.repository.js';

// Where the next clock-driven change of a session is due (the BullMQ job, SRS 7.3.6).
export abstract class SoloScheduler {
  abstract schedule(sessionId: bigint, at: Date): Promise<void>;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

export const toSoloSessionJson = ({
  id,
  state: s,
  ...r
}: SoloRecord): SoloSession => ({
  id: id.toString(),
  status: s.status,
  phase: s.phase,
  cycle_config: s.config,
  next_cycle_config: s.nextConfig,
  focus_phases_done: s.focusPhasesDone,
  phase_ends_at: iso(s.phaseEndsAt),
  paused_remaining_ms: s.pausedRemainingMs,
  waiting_since: iso(s.waitingSince),
  started_at: r.startedAt.toISOString(),
  ended_at: iso(s.endedAt),
  end_reason: s.endReason,
  focused_seconds: r.focusedSeconds,
  days: Object.entries(r.creditedDays)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([local_date, focused_seconds]) => ({ local_date, focused_seconds })),
  hit_daily_cap: r.hitDailyCap,
});

const deadline = (s: SoloState) =>
  s.status === 'running'
    ? s.phaseEndsAt
    : s.status === 'waiting'
      ? new Date(s.waitingSince!.getTime() + SOLO_WAIT_LIMIT_MS)
      : null;

// REQ-STUDY-10: the backend owns the Solo Session clock; the app only displays it.
@Injectable()
export class SoloSessionService {
  private readonly logger = new Logger('SoloSession');

  constructor(
    private readonly sessions: SoloSessionRepository,
    private readonly stats: StudyStatsRepository,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
    private readonly scheduler: SoloScheduler,
  ) {}

  async start(
    userId: bigint,
    config: CycleConfig,
  ): Promise<SoloSessionResponse> {
    // ponytail: AC2 (already a Room Session Participant → 40903) needs Participations, P3-B3 (#28).
    const now = this.clock.now();
    const record: SoloRecord = {
      id: this.ids.next(),
      userId,
      startedAt: now,
      focusedSeconds: 0,
      creditedDays: {},
      hitDailyCap: false,
      state: startSolo(config, now),
    };
    try {
      await this.sessions.insert(record);
    } catch (err) {
      if (isUniqueViolation(err, 'uq_solo_active_per_user'))
        throw new AppError(
          ErrorCode.FocusSessionAlreadyActive,
          'A Solo Session is already running',
        );
      throw err;
    }
    return this.announce(record, now);
  }

  async current(userId: bigint): Promise<CurrentSoloSessionResponse> {
    const id = await this.sessions.findActiveId(userId);
    if (id === undefined)
      return {
        solo_session: null,
        backend_time: this.clock.now().toISOString(),
      };
    const res = await this.change(id, userId, advance);
    // Just ended (wait ran out): the app reads it by id to show ended-expired.
    return res.solo_session.status === 'ended'
      ? { ...res, solo_session: null }
      : res;
  }

  get(userId: bigint, id: bigint) {
    return this.change(id, userId, advance);
  }

  act(userId: bigint, id: bigint, action: SoloAction) {
    return this.change(id, userId, (s, now) => applyAction(s, action, now));
  }

  // The BullMQ job: a phase end or the end of the 10-minute wait.
  async tick(id: bigint) {
    await this.change(id, null, advance);
  }

  private async change(
    id: bigint,
    userId: bigint | null,
    step: (s: SoloState, now: Date) => SoloStep,
  ): Promise<SoloSessionResponse> {
    const now = this.clock.now();
    const { record, changed } = await this.sessions.transaction(async (tx) => {
      const before = await this.sessions.lock(tx, id);
      if (!before || (userId !== null && before.userId !== userId))
        throw new AppError(ErrorCode.NotFound, 'Solo Session not found');
      const { state, focus } = step(before.state, now);
      if (focus.length === 0 && isDeepStrictEqual(state, before.state))
        return { record: before, changed: false };

      // DEC-24: focus is credited at each phase end and on pause / skip / stop, in the same transaction.
      const credits = focus.length
        ? await this.stats.credit(
            { userId: before.userId, source: 'solo', intervals: focus },
            tx,
          )
        : [];
      const creditedDays = { ...before.creditedDays };
      for (const c of credits)
        creditedDays[c.localDate] =
          (creditedDays[c.localDate] ?? 0) + c.seconds;
      const record: SoloRecord = {
        ...before,
        state,
        focusedSeconds:
          before.focusedSeconds + credits.reduce((n, c) => n + c.seconds, 0),
        creditedDays,
        hitDailyCap: before.hitDailyCap || credits.some((c) => c.capped),
      };
      await this.sessions.save(tx, record);
      return { record, changed: true };
    });
    return changed
      ? this.announce(record, now)
      : {
          solo_session: toSoloSessionJson(record),
          backend_time: now.toISOString(),
        };
  }

  // SRS 7.3.6 step 3: every device of the user reschedules its notifications from this.
  private async announce(
    record: SoloRecord,
    now: Date,
  ): Promise<SoloSessionResponse> {
    const response = {
      solo_session: toSoloSessionJson(record),
      backend_time: now.toISOString(),
    };
    await this.events.toUser(record.userId, 'SOLO_SESSION_UPDATE', response);
    const at = deadline(record.state);
    if (at)
      await this.scheduler.schedule(record.id, at).catch((err: unknown) =>
        // Reads and actions advance the session lazily, so a missed job only delays the event.
        this.logger.error(
          `could not schedule Solo Session ${record.id}: ${String(err)}`,
        ),
      );
    return response;
  }
}
