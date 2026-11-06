import { Inject, Injectable } from '@nestjs/common';
import type {
  CycleConfig,
  FocusPhase,
  SoloEndReason,
  SoloStatus,
} from '@nezfocus/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { isUniqueViolation } from '../../common/db-errors.js';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import type { SoloState } from './solo-machine.js';
import { soloSessions, type SoloSessionRow } from './solo.schema.js';

export type SoloRecord = {
  id: bigint;
  userId: bigint;
  startedAt: Date;
  focusedSeconds: number;
  creditedDays: Record<string, number>;
  hitDailyCap: boolean;
  state: SoloState;
};

const toRecord = (r: SoloSessionRow): SoloRecord => ({
  id: r.id,
  userId: r.userId,
  startedAt: r.startedAt,
  focusedSeconds: r.focusedSeconds,
  creditedDays: r.creditedDays,
  hitDailyCap: r.hitDailyCap,
  state: {
    config: {
      focus_min: r.focusMin,
      short_break_min: r.shortBreakMin,
      ...(r.longBreakMin !== null && r.longBreakEvery !== null
        ? { long_break_min: r.longBreakMin, long_break_every: r.longBreakEvery }
        : {}),
    },
    nextConfig: r.nextCycleConfig,
    status: r.status as SoloStatus,
    phase: r.phase as FocusPhase,
    focusPhasesDone: r.focusPhasesDone,
    phaseStartedAt: r.phaseStartedAt,
    phaseEndsAt: r.phaseEndsAt,
    pausedRemainingMs: r.pausedRemainingMs,
    waitingSince: r.waitingSince,
    endedAt: r.endedAt,
    endReason: r.endReason as SoloEndReason | null,
  },
});

const toColumns = ({ state: s, ...r }: SoloRecord) => ({
  focusMin: s.config.focus_min,
  shortBreakMin: s.config.short_break_min,
  longBreakMin: s.config.long_break_min ?? null,
  longBreakEvery: s.config.long_break_every ?? null,
  nextCycleConfig: s.nextConfig as CycleConfig | null,
  status: s.status,
  phase: s.phase,
  focusPhasesDone: s.focusPhasesDone,
  phaseStartedAt: s.phaseStartedAt,
  phaseEndsAt: s.phaseEndsAt,
  pausedRemainingMs: s.pausedRemainingMs,
  waitingSince: s.waitingSince,
  endedAt: s.endedAt,
  endReason: s.endReason,
  focusedSeconds: r.focusedSeconds,
  creditedDays: r.creditedDays,
  hitDailyCap: r.hitDailyCap,
});

@Injectable()
export class SoloSessionRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }

  // false: the user already has an active Solo Session (uq_solo_active_per_user).
  async insert(record: SoloRecord): Promise<boolean> {
    try {
      await this.db.insert(soloSessions).values({
        id: record.id,
        userId: record.userId,
        startedAt: record.startedAt,
        ...toColumns(record),
      });
      return true;
    } catch (err) {
      if (!isUniqueViolation(err, 'uq_solo_active_per_user')) throw err;
      return false;
    }
  }

  // Row lock so the BullMQ job and a user action never apply on top of each other.
  async lock(tx: Tx, id: bigint) {
    const [row] = await tx
      .select()
      .from(soloSessions)
      .where(eq(soloSessions.id, id))
      .for('update');
    return row && toRecord(row);
  }

  async findActiveId(userId: bigint) {
    const [row] = await this.db
      .select({ id: soloSessions.id })
      .from(soloSessions)
      .where(
        and(eq(soloSessions.userId, userId), isNull(soloSessions.endedAt)),
      );
    return row?.id;
  }

  async save(tx: Tx, record: SoloRecord) {
    await tx
      .update(soloSessions)
      .set(toColumns(record))
      .where(eq(soloSessions.id, record.id));
  }
}
