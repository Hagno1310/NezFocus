import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { messages } from '../messaging/messages.schema.js';
import { channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';

// SRS 8.2 `attachments`. duration_ms is for video / audio (v1.x, CR-28).
export const attachments = pgTable(
  'attachments',
  {
    id: bigint({ mode: 'bigint' }).primaryKey(), // Snowflake
    // SRS 8.2: no cascade — accounts are soft-deleted (SRS 8.1), files outlive them.
    uploaderId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id),
    purpose: varchar({ length: 20 }).notNull(), // avatar | server_icon | message
    // A message file: the channel it was uploaded for; the message once sent (else NULL).
    channelId: bigint({ mode: 'bigint' }).references(() => channels.id, {
      onDelete: 'cascade',
    }),
    messageId: bigint({ mode: 'bigint' }).references(() => messages.id, {
      onDelete: 'cascade',
    }),
    filename: varchar({ length: 255 }).notNull(),
    contentType: varchar({ length: 100 }).notNull(), // declared until complete, then from the bytes
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    width: integer(),
    height: integer(),
    storageKey: text().notNull(), // upload key while pending; the variants' prefix (avatar) or the original (message) once clean
    thumbnailKey: text(), // message images (CR-28 #29)
    scanStatus: varchar({ length: 10 }).notNull().default('pending'), // pending | clean
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_attachments_uploader').on(t.uploaderId),
    index('idx_attachments_message').on(t.messageId),
  ],
);

export type AttachmentRow = typeof attachments.$inferSelect;
