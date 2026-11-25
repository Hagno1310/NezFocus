import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  primaryKey,
  timestamp,
} from 'drizzle-orm/pg-core';
import { channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';

const id = () => bigint({ mode: 'bigint' });

// SRS 8.2 channel_recipients: the two people of a DM (type 3; Group DM is v1.x).
export const channelRecipients = pgTable(
  'channel_recipients',
  {
    channelId: id()
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    userId: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    closed: boolean().notNull().default(false), // REQ-DM-03: hidden on this user's side
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.userId] }),
    index('idx_channel_recipients_user').on(t.userId),
  ],
);

// SRS 8.2 dm_pairs, REQ-DM-03 AC2: the primary key keeps one DM per pair.
export const dmPairs = pgTable(
  'dm_pairs',
  {
    userIdLow: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userIdHigh: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: id()
      .notNull()
      .unique()
      .references(() => channels.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.userIdLow, t.userIdHigh] }),
    check('dm_pairs_ordered', sql`${t.userIdLow} < ${t.userIdHigh}`),
  ],
);
