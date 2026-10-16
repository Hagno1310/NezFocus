import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Not re-exported from db/schema.ts, so it never reaches a migration.
export const examples = pgTable('examples', {
  id: bigint({ mode: 'bigint' }).primaryKey(),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type ExampleRow = typeof examples.$inferSelect;
