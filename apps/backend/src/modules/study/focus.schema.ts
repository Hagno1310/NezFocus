import type { CycleConfig } from '@nezfocus/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { channels, servers } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';

const id = () => bigint({ mode: 'bigint' });
const tz = () => timestamp({ withTimezone: true });

export type LastAction = {
  by: string;
  action: 'start' | 'pause' | 'resume' | 'skip' | 'config';
};

// SRS 8.2 `focus_sessions` (Room Session, DEC-21), the current phase kept as in SRS 7.3.6.
export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: id().primaryKey(),
    channelId: id()
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    serverId: id()
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    startedBy: id().references(() => users.id, { onDelete: 'set null' }),
    hostId: id().references(() => users.id, { onDelete: 'set null' }), // NULL = no Host (REQ-STUDY-11)
    focusMin: smallint().notNull().default(25),
    shortBreakMin: smallint().notNull().default(5),
    longBreakMin: smallint(),
    longBreakEvery: smallint(),
    nextCycleConfig: jsonb().$type<CycleConfig>(),
    status: varchar({ length: 8 }).notNull().default('running'),
    phase: varchar({ length: 12 }).notNull().default('focus'),
    focusPhasesDone: smallint().notNull().default(0),
    // Start of the running stretch not yet credited: the phase start, or the last resume.
    phaseStartedAt: tz().notNull().defaultNow(),
    phaseEndsAt: tz(), // NULL when paused; the BullMQ job runs here
    pausedRemainingMs: bigint({ mode: 'number' }),
    // CR-28 #38: who did the last control action, kept until the next one or the next phase change.
    lastAction: jsonb().$type<LastAction>(),
    // CR-28 #38: the room has had no seat (away ones count) since then; 5 minutes → empty_channel.
    emptySince: tz(),
    startedAt: tz().notNull().defaultNow(),
    endedAt: tz(),
    endReason: varchar({ length: 16 }), // stopped | empty_channel | focus_disabled | channel_deleted
    endedBy: id().references(() => users.id, { onDelete: 'set null' }), // FOCUS_SESSION_END `ended_by`
  },
  (t) => [
    uniqueIndex('uq_focus_active_per_channel')
      .on(t.channelId)
      .where(sql`${t.endedAt} IS NULL`),
    check('focus_focus_min', sql`${t.focusMin} BETWEEN 5 AND 120`),
    check('focus_short_break_min', sql`${t.shortBreakMin} BETWEEN 1 AND 30`),
    check('focus_long_break_min', sql`${t.longBreakMin} BETWEEN 5 AND 60`),
    check('focus_long_break_every', sql`${t.longBreakEvery} BETWEEN 2 AND 8`),
  ],
);

export type FocusSessionRow = typeof focusSessions.$inferSelect;

// SRS 8.2 `focus_session_participations`: one row per join → leave (REQ-STUDY-15).
export const focusSessionParticipations = pgTable(
  'focus_session_participations',
  {
    id: id().primaryKey(),
    focusSessionId: id()
      .notNull()
      .references(() => focusSessions.id, { onDelete: 'cascade' }),
    userId: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: tz().notNull().defaultNow(),
    lastHeartbeatAt: tz().notNull().defaultNow(),
    leftAt: tz(),
    focusedSeconds: integer().notNull().default(0),
    // {local_date: seconds} credited, like solo_sessions (STUDY-17 history across midnight).
    creditedDays: jsonb().$type<Record<string, number>>().notNull().default({}),
  },
  (t) => [
    index('idx_focus_participations_user').on(t.userId, t.joinedAt),
    uniqueIndex('uq_participation_open_per_user')
      .on(t.userId)
      .where(sql`${t.leftAt} IS NULL`),
  ],
);

export type ParticipationRow = typeof focusSessionParticipations.$inferSelect;
