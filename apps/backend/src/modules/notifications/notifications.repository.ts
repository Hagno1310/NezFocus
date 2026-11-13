import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { notifications, type NotificationRow } from './notifications.schema.js';
import type { NotificationSource } from './notification-service.js';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // undefined = this person already has an item for that message.
  async insert(
    row: Omit<NotificationRow, 'createdAt'>,
  ): Promise<NotificationRow | undefined> {
    const [created] = await this.db
      .insert(notifications)
      .values(row)
      .onConflictDoNothing()
      .returning();
    return created;
  }

  deleteBySource(source: NotificationSource) {
    return this.db
      .delete(notifications)
      .where(where(source))
      .returning({ id: notifications.id, userId: notifications.userId });
  }
}

const where = (source: NotificationSource): SQL | undefined => {
  if ('message_id' in source)
    return sql`${notifications.data}->>'message_id' = ${String(source.message_id)}`;
  if ('task_id' in source) return eq(notifications.taskId, source.task_id);
  const { from_user_id, to_user_id } = source.friend_request;
  return and(
    eq(notifications.userId, to_user_id),
    eq(notifications.type, 'friend_request'),
    sql`${notifications.data}->>'actor_id' = ${String(from_user_id)}`,
  );
};
