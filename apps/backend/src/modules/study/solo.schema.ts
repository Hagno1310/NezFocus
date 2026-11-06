import type { CycleConfig } from '@nezfocus/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
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
import { users } from '../users/users.schema.js';

const tz = () => timestamp({ withTimezone: true });

// SRS 8.2 `solo_sessions` (REQ-STUDY-10), plus credited_days / hit_daily_cap for the summary (CR-29).
export const soloSessions = pgTable(
  'solo_sessions',
  {
    id: bigint({ mode: 'bigint' }).primaryKey(),
    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    focusMin: smallint().notNull(),
    shortBreakMin: smallint().notNull(),
    longBreakMin: smallint(),
    longBreakEvery: smallint(),
    nextCycleConfig: jsonb().$type<CycleConfig>(),
    status: varchar({ length: 8 }).notNull().default('running'), // running | paused | waiting | ended
    phase: varchar({ length: 12 }).notNull().default('focus'),
    focusPhasesDone: smallint().notNull().default(0),
    phaseStartedAt: tz().notNull().defaultNow(),
    phaseEndsAt: tz(),
    pausedRemainingMs: bigint({ mode: 'number' }),
    waitingSince: tz(),
    startedAt: tz().notNull().defaultNow(),
    endedAt: tz(),
    endReason: varchar({ length: 16 }),
    focusedSeconds: integer().notNull().default(0),
    creditedDays: jsonb().$type<Record<string, number>>().notNull().default({}),
    hitDailyCap: boolean().notNull().default(false),
  },
  (t) => [
    check('solo_focus_min', sql`${t.focusMin} BETWEEN 5 AND 120`),
    check('solo_short_break_min', sql`${t.shortBreakMin} BETWEEN 1 AND 30`),
    check('solo_long_break_min', sql`${t.longBreakMin} BETWEEN 5 AND 60`),
    check('solo_long_break_every', sql`${t.longBreakEvery} BETWEEN 2 AND 8`),
    // One running / paused / waiting Solo per user (REQ-STUDY-10).
    uniqueIndex('uq_solo_active_per_user')
      .on(t.userId)
      .where(sql`${t.endedAt} IS NULL`),
    index('idx_solo_sessions_user_time').on(t.userId, t.startedAt),
  ],
);

export type SoloSessionRow = typeof soloSessions.$inferSelect;
