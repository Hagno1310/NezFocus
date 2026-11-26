import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';

const id = () => bigint({ mode: 'bigint' });
const tz = () => timestamp({ withTimezone: true });

// SRS 8.2 messages. Embeds are link previews (REQ-MSG-02, v1.x CR-28 #8).
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
    pinnedAt: tz(), // REQ-MSG-10
    pinnedBy: id(),
    deletedAt: tz(), // REQ-MSG-05: soft-delete, gone for everyone
    createdAt: tz().notNull().defaultNow(),
  },
  (t) => [
    index('idx_messages_channel').on(t.channelId, t.id.desc()),
    uniqueIndex('uq_messages_author_nonce')
      .on(t.authorId, t.nonce)
      .where(sql`${t.nonce} IS NOT NULL`),
    index('idx_messages_author_time').on(t.authorId, t.createdAt),
    index('idx_messages_pins')
      .on(t.channelId, t.pinnedAt.desc())
      .where(sql`${t.pinnedAt} IS NOT NULL`),
  ],
);

export type MessageRow = typeof messages.$inferSelect;

// SRS 8.2 message_reactions (REQ-MSG-05): one row per person per emoji.
export const messageReactions = pgTable(
  'message_reactions',
  {
    messageId: id()
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    emoji: varchar({ length: 64 }).notNull(), // Unicode emoji (custom emoji: Backlog)
    userId: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: tz().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.emoji, t.userId] })],
);

// SRS 8.2 read_states (REQ-NOTIF-01). 0 = nothing read; the contract says null.
export const readStates = pgTable(
  'read_states',
  {
    userId: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: id()
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    lastReadMessageId: id()
      .notNull()
      .default(sql`0`),
    // CR-12: +1 per unread message that concerns me, server channels only.
    mentionCount: integer().notNull().default(0),
    updatedAt: tz().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channelId] })],
);
