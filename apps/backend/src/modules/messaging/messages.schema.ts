import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';

const id = () => bigint({ mode: 'bigint' });
const tz = () => timestamp({ withTimezone: true });

// SRS 8.2 messages. Embeds, pins and soft-delete columns arrive with P3-A1 / P3-A2.
export const messages = pgTable(
  'messages',
  {
    id: id().primaryKey(), // Snowflake: ordering by id is ordering by time
    channelId: id()
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    // A deleted account keeps its id here ("Tài khoản đã bị xóa").
    authorId: id()
      .notNull()
      .references(() => users.id),
    type: smallint().notNull().default(0), // 8.2.1, messageTypeCode
    content: varchar({ length: 2000 }).notNull().default(''), // NFC (REQ-MSG-01)
    nonce: varchar({ length: 64 }), // REQ-MSG-09
    replyToId: id(), // no FK: the replied message may be gone
    mentionUserIds: id()
      .array()
      .notNull()
      .default(sql`'{}'`),
    mentionRoleIds: id()
      .array()
      .notNull()
      .default(sql`'{}'`),
    mentionEveryone: boolean().notNull().default(false),
    systemData: jsonb(), // REQ-MSG-11: kind parameters only, never wording
    editedAt: tz(),
    pinnedAt: tz(),
    createdAt: tz().notNull().defaultNow(),
  },
  (t) => [
    index('idx_messages_channel').on(t.channelId, t.id.desc()),
    uniqueIndex('uq_messages_author_nonce')
      .on(t.authorId, t.nonce)
      .where(sql`${t.nonce} IS NOT NULL`),
    index('idx_messages_author_time').on(t.authorId, t.createdAt),
  ],
);

export type MessageRow = typeof messages.$inferSelect;
