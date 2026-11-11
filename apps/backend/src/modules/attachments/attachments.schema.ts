import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

// SRS 8.2 `attachments`. channel_id / message_id / thumbnail_key / duration_ms arrive with
// message files (REQ-MSG-04, P3-A2.1 (#123)).
export const attachments = pgTable(
  'attachments',
  {
    id: bigint({ mode: 'bigint' }).primaryKey(), // Snowflake
    // SRS 8.2: no cascade — accounts are soft-deleted (SRS 8.1), files outlive them.
    uploaderId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id),
    purpose: varchar({ length: 20 }).notNull(), // avatar (server_icon, group_icon, message later)
    filename: varchar({ length: 255 }).notNull(),
    contentType: varchar({ length: 100 }).notNull(), // declared until complete, then from the bytes
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    width: integer(),
    height: integer(),
    storageKey: text().notNull(), // upload key while pending; the variants' prefix once clean
    scanStatus: varchar({ length: 10 }).notNull().default('pending'), // pending | clean
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_attachments_uploader').on(t.uploaderId)],
);

export type AttachmentRow = typeof attachments.$inferSelect;
