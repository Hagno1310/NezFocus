import { Injectable } from '@nestjs/common';
import {
  NotificationData,
  type Notification,
  type NotificationType,
} from '@nezfocus/shared';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import {
  NotificationsRepository,
  type NotificationSource,
} from './notifications.repository.js';
import { PushDispatcher } from './push-service.js';
import type { NotificationRow } from './notifications.schema.js';

export type { NotificationSource };

export type CreateNotificationOptions = {
  task_id?: bigint; // task_* items (SRS 8.2), removed with deleteBySource({ task_id })
  read?: boolean; // REQ-NOTIF-05: kick / ban while the app is open
};

// REQ-NOTIF-05. Owner: notifications (B). Other modules inject this (WORKFLOW 4.3).
// REQ-NOTIF-02, CR-28 #36: create also pushes, for the types in PushDispatcher's ITEM_PUSH.
export abstract class NotificationService {
  // null = skipped: data.actor_id is the recipient, or a mention / reply for this message exists.
  // Types without actor_id (task_assigned self-claim, AC9) are filtered by the caller.
  abstract create<T extends NotificationType>(
    userId: bigint,
    type: T,
    data: NotificationData<T>,
    opts?: CreateNotificationOptions,
  ): Promise<bigint | null>;
  // Source gone (message / task deleted, request declined or cancelled) → NOTIFICATION_DELETE.
  abstract deleteBySource(source: NotificationSource): Promise<void>;
}

@Injectable()
export class DbNotificationService extends NotificationService {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly events: EventPublisher,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly push: PushDispatcher,
  ) {
    super();
  }

  async create<T extends NotificationType>(
    userId: bigint,
    type: T,
    data: NotificationData<T>,
    opts: CreateNotificationOptions = {},
  ) {
    const parsed = NotificationData[type].parse(data) as Record<
      string,
      unknown
    >;
    if (parsed.actor_id === String(userId)) return null;
    const row = await this.repo.insert({
      id: this.ids.next(),
      userId,
      type,
      data: parsed,
      taskId: opts.task_id ?? null,
      readAt: opts.read ? this.clock.now() : null,
    });
    if (!row) return null;
    await this.events.toUser(
      userId,
      'NOTIFICATION_CREATE',
      toNotification(row),
    );
    // Not awaited: a friend request's 201 does not wait for FCM; forItem never throws.
    void this.push.forItem(userId, row.id, type, parsed as NotificationData<T>);
    return row.id;
  }

  async deleteBySource(source: NotificationSource) {
    const byUser = new Map<bigint, string[]>();
    for (const { id, userId } of await this.repo.deleteBySource(source))
      byUser.set(userId, [...(byUser.get(userId) ?? []), String(id)]);
    for (const [userId, ids] of byUser)
      await this.events.toUser(userId, 'NOTIFICATION_DELETE', { ids });
  }
}

const toNotification = (row: NotificationRow) =>
  ({
    id: String(row.id),
    type: row.type,
    data: row.data,
    task_id: row.taskId === null ? null : String(row.taskId),
    read: row.readAt !== null,
    created_at: row.createdAt.toISOString(),
  }) as Notification;
