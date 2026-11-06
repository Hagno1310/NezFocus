import { isDeepStrictEqual } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import {
  ErrorCode,
  SOLO_WAIT_LIMIT_MS,
  type CycleConfig,
  type SoloAction,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import {
  advance,
  applyAction,
  startSolo,
  type SoloState,
  type SoloStep,
} from './solo-machine.js';
import { toSoloResponse } from './solo-session.dto.js';
import {
  SoloSessionRepository,
  type SoloRecord,
} from './solo-session.repository.js';
import { StudyStatsRepository } from './study-stats.repository.js';

// Where the next clock-driven change of a session is due (the BullMQ job, SRS 7.3.6).
export abstract class SoloScheduler {
  abstract schedule(sessionId: bigint, at: Date): Promise<void>;
}

const deadline = (s: SoloState) =>
  s.status === 'running'
    ? s.phaseEndsAt
    : s.status === 'waiting'
      ? new Date(s.waitingSince!.getTime() + SOLO_WAIT_LIMIT_MS)
      : null;

// A session as of `now`; the controller turns it into JSON.
export type SoloView = { record: SoloRecord; now: Date };

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

  async start(userId: bigint, config: CycleConfig): Promise<SoloView> {
    // ponytail: AC2 (already a Room Session Participant → 40903) needs Participations, P3-B3 (#28).
    // A session whose wait ran out but whose job was lost must not block the start: advance it first.
    const active = await this.sessions.findActiveId(userId);
    if (active !== undefined) await this.change(active, userId, advance);
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
    if (!(await this.sessions.insert(record)))
      throw new AppError(
        ErrorCode.FocusSessionAlreadyActive,
        'A Solo Session is already running',
      );
    await this.announce(record, now);
    return { record, now };
  }

  async current(
    userId: bigint,
  ): Promise<{ record: SoloRecord | null; now: Date }> {
    const id = await this.sessions.findActiveId(userId);
    if (id === undefined) return { record: null, now: this.clock.now() };
    const view = await this.change(id, userId, advance);
    // Just ended (wait ran out): the app reads it by id to show ended-expired.
    return view.record.state.status === 'ended'
      ? { ...view, record: null }
      : view;
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
  ): Promise<SoloView> {
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
    if (changed) await this.announce(record, now);
    return { record, now };
  }

  // SRS 7.3.6 step 3: every device of the user reschedules its notifications from this.
  private async announce(record: SoloRecord, now: Date) {
    await this.events.toUser(
      record.userId,
      'SOLO_SESSION_UPDATE',
      toSoloResponse({ record, now }),
    );
    const at = deadline(record.state);
    if (at)
      await this.scheduler.schedule(record.id, at).catch((err: unknown) =>
        // Reads and actions advance the session lazily, so a missed job only delays the event.
        this.logger.error(
          `could not schedule Solo Session ${record.id}: ${String(err)}`,
        ),
      );
  }
}
