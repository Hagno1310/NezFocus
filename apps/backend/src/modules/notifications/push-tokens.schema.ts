import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { authSessions } from '../auth/auth.schema.js';
import { users } from '../users/users.schema.js';

// SRS 8.2 push_tokens (REQ-NOTIF-02/04): one per signed-in device. The DDL's `locale` column is
// left out: push text follows user_settings.locale (SRS 5.6 v1.9).
export const pushTokens = pgTable(
  'push_tokens',
  {
    token: text().primaryKey(),
    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // REQ-AUTH-07 AC1: the session's end removes it (PushTokens.removeForSessions).
    sessionId: bigint({ mode: 'bigint' }).references(() => authSessions.id, {
      onDelete: 'cascade',
    }),
    kind: varchar({ length: 12 }).notNull(), // fcm | apns | apns_voip
    platform: varchar({ length: 10 }).notNull(), // ios | android, the session's
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_push_tokens_user').on(t.userId)],
);

export type PushTokenRow = typeof pushTokens.$inferSelect;
