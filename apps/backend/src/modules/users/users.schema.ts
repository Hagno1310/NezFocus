import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// SRS 8.2 `users`. Columns arrive with the tickets that use them (profile, 2FA, safety…).
export const users = pgTable(
  'users',
  {
    id: bigint({ mode: 'bigint' }).primaryKey(), // Snowflake
    username: varchar({ length: 32 }).unique(), // DEC-03, lowercase; NULL until Complete account
    email: varchar({ length: 255 }), // stored lowercase; NULL after purge
    passwordHash: varchar({ length: 255 }), // Argon2id; NULL until Complete account
    displayName: varchar({ length: 32 }),
    avatarKey: text(), // prefix of the webp sizes (attachments/media.ts); NULL → initials
    bio: varchar({ length: 200 }), // v1.7 (CR-09)
    profileUpdatedAt: timestamp({ withTimezone: true }), // v1.10: last display name / avatar / bio change
    accountStatus: varchar({ length: 20 }).notNull().default('active'), // 8.4.6
    emailVerifiedAt: timestamp({ withTimezone: true }),
    termsVersion: varchar({ length: 20 }),
    termsAcceptedAt: timestamp({ withTimezone: true }),
    accountCompletedAt: timestamp({ withTimezone: true }), // NULL → every sign-in lands on Complete account
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_users_email')
      .on(sql`lower(${t.email})`)
      .where(sql`${t.email} IS NOT NULL`),
    check('users_username_format', sql`${t.username} ~ '^[a-z0-9_.]{2,32}$'`),
  ],
);

export type UserRow = typeof users.$inferSelect;

// SRS 8.2 `user_settings`. The v1.x columns (show_on_leaderboard, share_study_stats,
// analytics_opt_out, study_mode_schedule) come with their features.
export const userSettings = pgTable('user_settings', {
  userId: bigint({ mode: 'bigint' })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  timezone: varchar({ length: 64 }).notNull().default('Asia/Ho_Chi_Minh'), // IANA
  timezoneChangedAt: timestamp({ withTimezone: true }), // Complete account does not set it
  locale: varchar({ length: 8 }).notNull().default('vi'),
  theme: varchar({ length: 8 }).notNull().default('system'), // system | dark | light (SRS 3.3)
  // REQ-AUTH-05 (SRS 8.2): written by the Gateway on op 3; online | idle | dnd | invisible.
  preferredStatus: varchar({ length: 12 }).notNull().default('online'),
  allowDmFromServerMembers: boolean().notNull().default(true), // REQ-DM-02
  hidePushContent: boolean().notNull().default(false), // REQ-NOTIF-02
  showStudyActivity: boolean().notNull().default(true), // CR-24 "Hiện hoạt động học"
  focusSoundAlways: boolean().notNull().default(false), // SRS 3.3, foreground only (CR-28 #22)
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
