import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// REQ-NOTIF-05 (v1.10): the one list for notifications.type at MVP. Order matters to no one.
export const NotificationType = z.enum([
  'mention',
  'reply',
  'friend_request',
  'friend_accepted',
  'task_assigned',
  'task_reminder',
  'task_unassigned',
  'missed_call',
  'owner_transferred',
  'moderation',
  'report_reviewed',
  'reports_pending',
  'profile_reset',
  'server_removed',
]);
export type NotificationType = z.infer<typeof NotificationType>;

// NFR-I18N-04: data = ids and values only, never sentences; names and message previews are
// read when the inbox is listed (P4-B1.2 #188), so an edited message shows its new text.
const MessageSource = z.object({
  actor_id: SnowflakeId,
  server_id: SnowflakeId,
  channel_id: SnowflakeId,
  message_id: SnowflakeId,
});

// REQ-MSG-03 / spec 06: "{Tên} nhắc tới @everyone" needs to know how I was mentioned.
const MentionData = z.discriminatedUnion('via', [
  MessageSource.extend({ via: z.enum(['user', 'everyone', 'here']) }),
  MessageSource.extend({ via: z.literal('role'), role_id: SnowflakeId }),
]);

const FromUser = z.object({ actor_id: SnowflakeId });

// REQ-NOTIF-05 `moderation` (no push, never says who): timeout, a changed duration, kick, ban.
// The server's name is read when the inbox is listed: the user may no longer be in it.
export const ModerationData = z.object({
  server_id: SnowflakeId,
  action: z.enum(['timeout', 'timeout_changed', 'kick', 'ban']),
  timeout_until: z.iso.datetime().nullable(),
  reason: z.string().nullable(),
});
export type ModerationData = z.infer<typeof ModerationData>;

// REQ-SRV-05 (08 A4): "An đã chuyển quyền Owner của Ôn thi Giải tích 2 cho bạn".
export const OwnerTransferredData = z.object({
  actor_id: SnowflakeId,
  server_id: SnowflakeId,
});
export type OwnerTransferredData = z.infer<typeof OwnerTransferredData>;

// ponytail: the owner of each remaining type fills in its fields (P4-B1.1 #187); until then
// any object passes so callers can already create them.
const Pending = z.looseObject({});

export const NotificationData = {
  mention: MentionData,
  reply: MessageSource,
  friend_request: FromUser, // REQ-FRIEND-01: the message is friendships.request_message
  friend_accepted: FromUser, // REQ-FRIEND-02: item of the request's sender
  task_assigned: Pending,
  task_reminder: Pending,
  task_unassigned: Pending,
  missed_call: Pending,
  owner_transferred: OwnerTransferredData,
  moderation: ModerationData,
  report_reviewed: Pending,
  reports_pending: Pending,
  profile_reset: Pending,
  server_removed: Pending,
} as const satisfies Record<NotificationType, z.ZodType>;
export type NotificationData<T extends NotificationType = NotificationType> =
  z.infer<(typeof NotificationData)[T]>;

const NotificationBase = z.object({
  id: SnowflakeId,
  task_id: SnowflakeId.nullable(), // SRS 8.2: task_* items, removed with the task
  read: z.boolean(),
  created_at: z.iso.datetime(),
});

const NotificationOf = <T extends NotificationType>(type: T) =>
  NotificationBase.extend({
    type: z.literal(type),
    data: NotificationData[type],
  });

// P4-B1.1 (#187) adds the resolved actor and source for the inbox list.
export type Notification = {
  [T in NotificationType]: z.infer<typeof NotificationBase> & {
    type: T;
    data: NotificationData<T>;
  };
}[NotificationType];
// The mapped type above keeps `data` narrowed by `type`; a .map() over the enum cannot.
export const Notification = z.discriminatedUnion(
  'type',
  NotificationType.options.map(NotificationOf) as [
    ReturnType<typeof NotificationOf>,
    ...ReturnType<typeof NotificationOf>[],
  ],
) as unknown as z.ZodType<Notification>;

export const NotificationDeleted = z.object({ ids: z.array(SnowflakeId) });
export type NotificationDeleted = z.infer<typeof NotificationDeleted>;
