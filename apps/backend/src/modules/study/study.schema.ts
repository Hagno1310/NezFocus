import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

// SRS 8.2 `daily_study_stats`: focus totals per local day (REQ-STUDY-03/04/13/15).
export const dailyStudyStats = pgTable(
  'daily_study_stats',
  {
    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localDate: date().notNull(),
    timezone: varchar({ length: 64 }).notNull(),
    focusedSeconds: integer().notNull().default(0), // Room + Solo
    soloSeconds: integer().notNull().default(0), // the Solo Session part of focusedSeconds
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.localDate] }),
    check('daily_study_stats_cap', sql`${t.focusedSeconds} <= 57600`),
  ],
);

export type DailyStudyStatsRow = typeof dailyStudyStats.$inferSelect;
