import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// SRS 8.7: local settings and sync cursors, one JSON value per key.
export const kv = sqliteTable('kv', {
  key: text().primaryKey(),
  value: text().notNull(),
});
