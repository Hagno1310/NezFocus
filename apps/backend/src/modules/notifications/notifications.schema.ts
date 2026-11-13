import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

// SRS 8.2 `notifications` (REQ-NOTIF-05): type + data (ids, no sentences, NFR-I18N-04).
export const notifications = pgTable(
  'notifications',
  {
    id: bigint({ mode: 'bigint' }).primaryKey(),
    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar({ length: 24 }).notNull(),
    data: jsonb().$type<Record<string, unknown>>().notNull(),
    taskId: bigint({ mode: 'bigint' }), // task_* items, deleted with the task (CR-21)
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_notifications_user').on(t.userId, t.id.desc()),
    index('idx_notifications_task')
      .on(t.taskId)
      .where(sql`${t.taskId} IS NOT NULL`),
    // REQ-MSG-03 (CR-12): one item per message per person; also finds a deleted message's items.
    uniqueIndex('uq_notifications_message')
      .on(sql`(${t.data}->>'message_id')`, t.userId)
      .where(sql`${t.data}->>'message_id' IS NOT NULL`),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
