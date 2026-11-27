import { Inject, Injectable } from '@nestjs/common';
import type {
  CycleConfig,
  FocusPhase,
  FocusSessionEndReason,
} from '@nezfocus/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import { serverMembers } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import type { DayCredit } from './focused-time.js';
import {
  focusSessionParticipations,
  focusSessions,
  type FocusSessionRow,
  type ParticipationRow,
} from './focus.schema.js';
import type { RoomState } from './room-machine.js';

export type RoomRecord = {
  id: bigint;
  channelId: bigint;
  serverId: bigint;
  startedBy: bigint | null;
  hostId: bigint | null;
  startedAt: Date;
  emptySince: Date | null;
  state: RoomState;
};

export type Participation = Pick<
  ParticipationRow,
  | 'id'
  | 'userId'
  | 'joinedAt'
  | 'leftAt'
  | 'lastHeartbeatAt'
  | 'focusedSeconds'
  | 'creditedDays'
>;

const toRecord = (r: FocusSessionRow): RoomRecord => ({
  id: r.id,
  channelId: r.channelId,
  serverId: r.serverId,
  startedBy: r.startedBy,
  hostId: r.hostId,
  startedAt: r.startedAt,
  emptySince: r.emptySince,
  state: {
    config: {
      focus_min: r.focusMin,
      short_break_min: r.shortBreakMin,
      ...(r.longBreakMin !== null && r.longBreakEvery !== null
        ? { long_break_min: r.longBreakMin, long_break_every: r.longBreakEvery }
        : {}),
    },
    nextConfig: r.nextCycleConfig,
    status: (r.endedAt ? 'ended' : r.status) as RoomState['status'],
    phase: r.phase as FocusPhase,
    focusPhasesDone: r.focusPhasesDone,
    phaseStartedAt: r.phaseStartedAt,
    phaseEndsAt: r.phaseEndsAt,
    pausedRemainingMs: r.pausedRemainingMs,
    lastAction: r.lastAction,
    endedAt: r.endedAt,
    endReason: r.endReason as FocusSessionEndReason | null,
    endedBy: r.endedBy,
  },
});

const toColumns = ({ state: s, ...r }: RoomRecord) => ({
  hostId: r.hostId,
  emptySince: r.emptySince,
  focusMin: s.config.focus_min,
  shortBreakMin: s.config.short_break_min,
  longBreakMin: s.config.long_break_min ?? null,
  longBreakEvery: s.config.long_break_every ?? null,
  nextCycleConfig: s.nextConfig as CycleConfig | null,
  // SRS 8.2 keeps running | paused; an ended session is told by ended_at.
  status: s.status === 'ended' ? 'running' : s.status,
  phase: s.phase,
  focusPhasesDone: s.focusPhasesDone,
  phaseStartedAt: s.phaseStartedAt,
  phaseEndsAt: s.phaseEndsAt,
  pausedRemainingMs: s.pausedRemainingMs,
  lastAction: s.lastAction,
  endedAt: s.endedAt,
  endReason: s.endReason,
  endedBy: s.endedBy,
});

const participation = {
  id: focusSessionParticipations.id,
  userId: focusSessionParticipations.userId,
  joinedAt: focusSessionParticipations.joinedAt,
  leftAt: focusSessionParticipations.leftAt,
  lastHeartbeatAt: focusSessionParticipations.lastHeartbeatAt,
  focusedSeconds: focusSessionParticipations.focusedSeconds,
  creditedDays: focusSessionParticipations.creditedDays,
};

@Injectable()
export class RoomSessionRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }

  // false: the room already has a running session (uq_focus_active_per_channel, STUDY-01 AC2).
  async insert(tx: Tx, record: RoomRecord): Promise<boolean> {
    const rows = await tx
      .insert(focusSessions)
      .values({
        id: record.id,
        channelId: record.channelId,
        serverId: record.serverId,
        startedBy: record.startedBy,
        startedAt: record.startedAt,
        ...toColumns(record),
      })
      .onConflictDoNothing()
      .returning({ id: focusSessions.id });
    return rows.length > 0;
  }

  // Row lock so the BullMQ job, a control and a room change never apply on top of each other.
  async lock(tx: Tx, id: bigint) {
    const [row] = await tx
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.id, id))
      .for('update');
    return row && toRecord(row);
  }

  async activeIdOf(channelId: bigint, executor: Db | Tx = this.db) {
    const [row] = await executor
      .select({ id: focusSessions.id })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.channelId, channelId),
          isNull(focusSessions.endedAt),
        ),
      );
    return row?.id;
  }

  async find(id: bigint) {
    const [row] = await this.db
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.id, id));
    return row && toRecord(row);
  }

  // READY.focus_sessions: running sessions of the servers the user is in.
  async activeForMember(userId: bigint) {
    const rows = await this.db
      .select()
      .from(focusSessions)
      .where(
        and(
          isNull(focusSessions.endedAt),
          inArray(
            focusSessions.serverId,
            this.db
              .select({ id: serverMembers.serverId })
              .from(serverMembers)
              .where(eq(serverMembers.userId, userId)),
          ),
        ),
      );
    return rows.map(toRecord);
  }

  async save(tx: Tx, record: RoomRecord) {
    await tx
      .update(focusSessions)
      .set(toColumns(record))
      .where(eq(focusSessions.id, record.id));
  }

  // Open Participations; someone already counted elsewhere (a stale open row) is skipped.
  async join(
    tx: Tx,
    sessionId: bigint,
    people: { id: bigint; userId: bigint; joinedAt: Date }[],
  ) {
    if (!people.length) return;
    await tx
      .insert(focusSessionParticipations)
      .values(
        people.map((p) => ({
          id: p.id,
          focusSessionId: sessionId,
          userId: p.userId,
          joinedAt: p.joinedAt,
          lastHeartbeatAt: p.joinedAt,
        })),
      )
      .onConflictDoNothing();
  }

  participations(
    sessionId: bigint,
    executor: Db | Tx = this.db,
  ): Promise<Participation[]> {
    return executor
      .select(participation)
      .from(focusSessionParticipations)
      .where(eq(focusSessionParticipations.focusSessionId, sessionId))
      .orderBy(focusSessionParticipations.joinedAt);
  }

  // Every user's Participations in these sessions (READY's `me`).
  participationsOf(userId: bigint, sessionIds: bigint[]) {
    if (!sessionIds.length) return Promise.resolve([]);
    return this.db
      .select({
        ...participation,
        sessionId: focusSessionParticipations.focusSessionId,
      })
      .from(focusSessionParticipations)
      .where(
        and(
          eq(focusSessionParticipations.userId, userId),
          inArray(focusSessionParticipations.focusSessionId, sessionIds),
        ),
      );
  }

  // Seconds the stats core accepted, per local day (16 h cap and midnight split applied there).
  async credited(tx: Tx, p: Participation, days: DayCredit[]) {
    const creditedDays = { ...p.creditedDays };
    for (const d of days)
      creditedDays[d.localDate] = (creditedDays[d.localDate] ?? 0) + d.seconds;
    await tx
      .update(focusSessionParticipations)
      .set({
        focusedSeconds: sql`${focusSessionParticipations.focusedSeconds} + ${days.reduce((n, d) => n + d.seconds, 0)}`,
        creditedDays,
      })
      .where(eq(focusSessionParticipations.id, p.id));
  }

  // The user's open Participation, in whatever session (uq_participation_open_per_user).
  async openOf(userId: bigint, executor: Db | Tx = this.db) {
    const [row] = await executor
      .select({
        ...participation,
        sessionId: focusSessionParticipations.focusSessionId,
      })
      .from(focusSessionParticipations)
      .where(
        and(
          eq(focusSessionParticipations.userId, userId),
          isNull(focusSessionParticipations.leftAt),
        ),
      );
    return row;
  }

  async leave(tx: Tx, participationId: bigint, at: Date) {
    await tx
      .update(focusSessionParticipations)
      .set({ leftAt: at })
      .where(eq(focusSessionParticipations.id, participationId));
  }

  // REQ-STUDY-15 (2): op 5, every 60 s.
  async heartbeat(userId: bigint, sessionId: bigint, at: Date) {
    const rows = await this.db
      .update(focusSessionParticipations)
      .set({ lastHeartbeatAt: at })
      .where(
        and(
          eq(focusSessionParticipations.userId, userId),
          eq(focusSessionParticipations.focusSessionId, sessionId),
          isNull(focusSessionParticipations.leftAt),
        ),
      )
      .returning({ id: focusSessionParticipations.id });
    return rows.length > 0;
  }

  // STUDY-11 "{người kế tiếp} sẽ điều khiển phiên học": no server nicknames, so display name, else username.
  async nameOf(userId: bigint) {
    const [row] = await this.db
      .select({ displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, userId));
    return row ? (row.displayName ?? row.username ?? '') : null;
  }

  async leaveAll(tx: Tx, sessionId: bigint, at: Date) {
    await tx
      .update(focusSessionParticipations)
      .set({ leftAt: at })
      .where(
        and(
          eq(focusSessionParticipations.focusSessionId, sessionId),
          isNull(focusSessionParticipations.leftAt),
        ),
      );
  }
}
