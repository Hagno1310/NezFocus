import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

export const FriendshipStatus = { pending: 0, accepted: 1 } as const; // SRS 8.4.2

// SRS 8.2 `friendships`: one row per pair, low < high.
export const friendships = pgTable(
  'friendships',
  {
    userIdLow: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userIdHigh: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: smallint().notNull(),
    requestedBy: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestMessage: varchar({ length: 150 }), // v1.9 (CR-25): NULL once accepted
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userIdLow, t.userIdHigh] }),
    check('friendships_order', sql`${t.userIdLow} < ${t.userIdHigh}`),
    index('idx_friendships_high').on(t.userIdHigh),
  ],
);

// SRS 8.2 `user_blocks`.
export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    check('user_blocks_not_self', sql`${t.blockerId} <> ${t.blockedId}`),
    index('idx_user_blocks_blocked').on(t.blockedId),
  ],
);

export type FriendshipRow = typeof friendships.$inferSelect;
