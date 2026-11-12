import { sql } from 'drizzle-orm';
import {
  bigint,
  customType,
  index,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

// SRS 8.2 `email_codes`: keyed by address because the account may not exist yet.
export const emailCodes = pgTable(
  'email_codes',
  {
    email: varchar({ length: 255 }).notNull(), // lowercase
    purpose: varchar({ length: 16 }).notNull(), // sign_in | reset_password, never interchangeable
    codeHash: varchar({ length: 255 }).notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(), // +15 min
    attempts: smallint().notNull().default(0), // 5 wrong → code cancelled
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.email, t.purpose] })],
);

export type EmailCodeRow = typeof emailCodes.$inferSelect;

// SRS 8.2: one row = one refresh-token family = one device sign-in.
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: bigint({ mode: 'bigint' }).primaryKey(),
    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceName: varchar({ length: 100 }),
    deviceId: varchar({ length: 64 }), // CR-28 #10
    platform: varchar({ length: 10 }).notNull(), // ios | android
    osVersion: varchar({ length: 20 }), // S-ME-03 "Android 13"
    appVersion: varchar({ length: 20 }),
    ipPrefix: varchar({ length: 45 }), // NFR-PRIV-02
    trustedUntil: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp({ withTimezone: true }),
    revokeReason: varchar({ length: 32 }), // logout | revoked | reuse_detected | password_reset
  },
  (t) => [
    index('idx_auth_sessions_user')
      .on(t.userId)
      .where(sql`${t.revokedAt} IS NULL`),
  ],
);

export type AuthSessionRow = typeof authSessions.$inferSelect;

export const refreshTokens = pgTable('refresh_tokens', {
  tokenHash: bytea().primaryKey(), // SHA-256, never the raw token
  sessionId: bigint({ mode: 'bigint' })
    .notNull()
    .references(() => authSessions.id, { onDelete: 'cascade' }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  usedAt: timestamp({ withTimezone: true }), // used again ⇒ reuse ⇒ revoke the family
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
