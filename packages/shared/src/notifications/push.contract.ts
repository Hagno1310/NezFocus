import { z } from 'zod';
import type { Locale } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';

export const PushTokenRoutes = {
  // SRS 5.3 Devices · bearer · PUT RegisterPushTokenRequest → 204. The token belongs to the
  // signed-in session: signing out or revoking that session removes it (REQ-AUTH-07 AC1).
  // Registering the same token again (FCM refresh, another account on the phone) moves it.
  register: '/users/@me/push-tokens',
  // DELETE → 204, also when the token is unknown (nothing left to remove).
  remove: '/users/@me/push-tokens/:token',
} as const;

// SRS 8.2 push_tokens.kind; apns / apns_voip wait for iOS (DEC-30).
export const PushTokenKind = z.enum(['fcm', 'apns', 'apns_voip']);
export type PushTokenKind = z.infer<typeof PushTokenKind>;

// The device is the session's (auth_sessions.device_id, CR-28 #10): no device_id here.
export const RegisterPushTokenRequest = z.object({
  token: z.string().min(1).max(4096),
  kind: PushTokenKind,
});
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequest>;

// REQ-NOTIF-02. Study Event reminders are v1.x (REQ-STUDY-12).
export const PushType = z.enum([
  'mention',
  'reply',
  'dm',
  'friend_request',
  'call',
  'call_cancel',
  'deadline',
  'task_assigned',
  'owner_transferred', // REQ-SRV-05
]);
export type PushType = z.infer<typeof PushType>;

// SRS 7.3.5 Android notification channel ids; the app creates them with these ids.
export const PushChannel = z.enum([
  'messages',
  'calls',
  'study',
  'room-running',
]);
export type PushChannel = z.infer<typeof PushChannel>;

export const PUSH_CHANNEL = {
  mention: 'messages',
  reply: 'messages',
  dm: 'messages',
  friend_request: 'messages',
  call: 'calls',
  call_cancel: 'calls',
  deadline: 'study',
  task_assigned: 'study', // REQ-NOTIF-02 (v1.9): "Nhắc học tập"
  owner_transferred: 'messages',
} as const satisfies Record<PushType, PushChannel>;

// SRS 5.6: a call is a high-priority data message (the app rings it); the rest are
// notification messages Android shows by itself, even when the app was swiped away.
export const isDataPush = (type: PushType) =>
  type === 'call' || type === 'call_cancel';

export const PUSH_MAX_BYTES = 4096; // SRS 5.6, the FCM limit

// FCM data values are strings; the size FCM checks is the UTF-8 bytes of what is sent.
export const pushBytes = (payload: object) =>
  new TextEncoder().encode(JSON.stringify(payload)).length;

// SRS 5.6 payload. `id` is what the push is about: the inbox item (mention, reply,
// friend_request), the message (dm) or the call; the app opens the screen from the rest.
export const PushPayload = z
  .object({
    type: PushType,
    id: SnowflakeId,
    server_id: SnowflakeId.optional(),
    channel_id: SnowflakeId.optional(),
    message_id: SnowflakeId.optional(),
    title: z.string(),
    body: z.string(),
  })
  .refine((p) => pushBytes(p) <= PUSH_MAX_BYTES, {
    message: `push payload over ${PUSH_MAX_BYTES} bytes`,
  });
export type PushPayload = z.infer<typeof PushPayload>;

// REQ-NOTIF-02 AC2, CR-28 #36: what "Ẩn nội dung xem trước" leaves of a push.
const HIDDEN = {
  vi: {
    message: 'Bạn có tin nhắn mới',
    friend_request: 'Bạn có lời mời kết bạn mới',
  },
  en: {
    message: 'You have a new message',
    friend_request: 'You have a new friend request',
  },
} as const satisfies Record<Locale, Record<string, string>>;

const MESSAGE_TYPES: readonly PushType[] = ['mention', 'reply', 'dm'];

export function concealPush(payload: PushPayload, locale: Locale): PushPayload {
  const text = HIDDEN[locale];
  if (MESSAGE_TYPES.includes(payload.type))
    return { ...payload, title: 'NezFocus', body: text.message };
  if (payload.type === 'friend_request')
    return { ...payload, title: 'NezFocus', body: text.friend_request };
  return payload;
}

// CR-28 #36: a push without an inbox item; the backend writes title / body in the recipient's
// language. Inbox items push from NotificationService.create.
export type PushRequest =
  | { type: 'dm'; message_id: string; channel_id: string }
  // ponytail: P3-B6.1 (#155) adds caller_name, has_video, leave_room_name?; no call push yet.
  | { type: 'call' | 'call_cancel'; call_id: string };
