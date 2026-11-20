import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// SRS 8.7 `relationships`: the Friends list opens from here (FRIEND-04 AC1, ≤ 300 ms).
// type = index in RelationshipType.options; json = the whole Relationship.
export const relationships = sqliteTable('relationships', {
  userId: text('user_id').primaryKey(),
  type: integer(),
  json: text().notNull(),
});
