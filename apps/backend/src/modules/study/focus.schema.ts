import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { channels, servers } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';

const id = () => bigint({ mode: 'bigint' });
const tz = () => timestamp({ withTimezone: true });

// SRS 8.2 `focus_sessions` (Room Session). Only what the history (REQ-STUDY-17) reads;
// the phase / host / cycle columns arrive with Room Sessions, P3-B3.2 (#146) and P3-B3.3 (#147).
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
    startedAt: tz().notNull().defaultNow(),
    endedAt: tz(),
  },
  (t) => [
    uniqueIndex('uq_focus_active_per_channel')
      .on(t.channelId)
      .where(sql`${t.endedAt} IS NULL`),
  ],
);

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
  },
  (t) => [
    index('idx_focus_participations_user').on(t.userId, t.joinedAt),
    uniqueIndex('uq_participation_open_per_user')
      .on(t.userId)
      .where(sql`${t.leftAt} IS NULL`),
  ],
);
