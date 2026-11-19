import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// SRS 8.7 (v1.3): every id is TEXT padded to 20 digits, so text order = number order.
// SRS CR-28 item 7: the outbox holds messages only (`kind = 'message'`).

export const cachedMessages = sqliteTable(
  'cached_messages',
  {
    id: text().primaryKey(),
    channelId: text('channel_id').notNull(),
    authorId: text('author_id'),
    type: integer(),
    content: text(),
    json: text().notNull(), // the whole MessageResponse
    createdAt: integer('created_at'),
  },
  (t) => [index('idx_cached_messages_channel').on(t.channelId, t.id)],
);

// 19/11/2026: which channel was opened when, for the 200-channel LRU (7.3.2).
export const cachedChannels = sqliteTable('cached_channels', {
  channelId: text('channel_id').primaryKey(),
  serverId: text('server_id'),
  openedAt: integer('opened_at').notNull(),
});

// 8.4.5: pending → sent | retrying | failed. server_id / last_error: 19/11/2026.
export const outbox = sqliteTable('outbox', {
  nonce: text().primaryKey(),
  kind: text().notNull(),
  channelId: text('channel_id'),
  serverId: text('server_id'),
  payload: text().notNull(),
  status: text().notNull(),
  attempts: integer().notNull().default(0),
  nextAttemptAt: integer('next_attempt_at'),
  lastError: text('last_error'),
  createdAt: integer('created_at'),
});

// REQ-NOTIF-01: the table only; P2-A4.4 (#106) owns the unread logic.
export const readStates = sqliteTable('read_states', {
  channelId: text('channel_id').primaryKey(),
  lastReadMessageId: text('last_read_message_id'),
  mentionCount: integer('mention_count'),
});
