import { z } from 'zod';
import { AvatarUrls } from '../auth/auth.contract.js';
import { ClientRequestId } from '../idempotency.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Message). A channel the caller cannot view (no
// VIEW_CHANNEL, not a member, a DM until P2-B3.1) is 40401, never 40302 (REQ-ROLE-03 AC3).
export const MessageRoutes = {
  // GET REQ-SEARCH-02: MessageHistoryQuery → MessageListResponse, oldest first · 40001, 40401
  // POST REQ-MSG-01 / MSG-09: CreateMessageRequest → 201 MessageResponse · 40001, 40029 (MSG-08),
  // 40302 (no SEND_MESSAGES), 40303 (DM), 40307 (timed out), 40401,
  // 40907 (same nonce already used for another channel or content)
  list: '/channels/:id/messages',
  // REQ-NOTIF-01 · no body · 204 · 40401 (channel or message)
  ack: '/channels/:id/messages/:messageId/ack',
} as const;

// REQ-MSG-01: at most 2000 characters, counted the way countMessageChars does.
export const MESSAGE_MAX_CHARS = 2000;

// REQ-MSG-01 v1.9: one counter for app and backend: NFC first, then code points.
export const countMessageChars = (text: string) =>
  [...text.normalize('NFC')].length;

// SRS 8.2.1, numbers as stored. The app gets the name; the backend maps with messageTypeCode.
export const messageTypeCode = {
  default: 0,
  member_join: 1,
  channel_pinned: 2,
  call: 3,
  recipient_add: 4,
  recipient_remove: 5,
  channel_name_change: 6,
  channel_icon_change: 7,
  focus_session_start: 8,
  focus_session_end: 9,
  task_reminder: 10,
  study_event_end: 11,
} as const;
export const MessageType = z.enum(
  Object.keys(messageTypeCode) as [keyof typeof messageTypeCode],
);
export type MessageType = z.infer<typeof MessageType>;

// Deleted account: id kept, the rest null ("Tài khoản đã bị xóa", SRS 8.2 messages.author_id).
export const MessageAuthor = z.object({
  id: SnowflakeId,
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar: AvatarUrls.nullable(),
});
export type MessageAuthor = z.infer<typeof MessageAuthor>;

const messageFields = {
  id: SnowflakeId,
  channel_id: SnowflakeId,
  author: MessageAuthor,
  content: z.string(),
  nonce: z.string().nullable(), // REQ-MSG-09: the sender's, so a pending copy can be matched
  mention_user_ids: z.array(SnowflakeId),
  mention_role_ids: z.array(SnowflakeId),
  mention_everyone: z.boolean(),
  // Filled from P3 on (MSG-05, MSG-10); null until then.
  reply_to_id: SnowflakeId.nullable(),
  edited_at: z.iso.datetime().nullable(),
  pinned_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
};

// REQ-MSG-11 v1.9: system_data holds the kind's parameters only, never wording. A system
// type joins this union with its own system_data in the ticket that sends it.
export const MessageResponse = z.discriminatedUnion('type', [
  z.object({
    ...messageFields,
    type: z.literal('default'),
    system_data: z.null(),
  }),
  z.object({
    ...messageFields,
    type: z.literal('member_join'), // into servers.system_channel_id (P2-A4.1)
    system_data: z.object({ user_id: SnowflakeId }),
  }),
]);
export type MessageResponse = z.infer<typeof MessageResponse>;

export const MessageListResponse = z.array(MessageResponse);
export type MessageListResponse = z.infer<typeof MessageListResponse>;

// MESSAGE_CREATE: the message plus its server (null in a DM), to everyone who can view the channel.
export const MessageCreateEvent = z.intersection(
  MessageResponse,
  z.object({ server_id: SnowflakeId.nullable() }),
);
export type MessageCreateEvent = z.infer<typeof MessageCreateEvent>;

// Saved NFC so the 2000 limit means the same in the counter and in the column.
export const CreateMessageRequest = z
  .object({
    content: z
      .string()
      .transform((s) => s.normalize('NFC'))
      .pipe(
        z
          .string()
          .refine(
            (s) => countMessageChars(s) <= MESSAGE_MAX_CHARS,
            `at most ${MESSAGE_MAX_CHARS} characters`,
          ),
      ),
    nonce: ClientRequestId,
  })
  // MSG-01 AC2: "empty and no file"; P3-A2 relaxes this when attachments are sent.
  .refine((b) => b.content.trim() !== '', {
    message: 'Message is empty',
    path: ['content'],
  });
export type CreateMessageRequest = z.infer<typeof CreateMessageRequest>;

// REQ-SEARCH-02: one cursor at most. around = up to limit/2 before it, it, then the rest after.
export const MessageHistoryQuery = z
  .object({
    before: SnowflakeId.optional(),
    after: SnowflakeId.optional(),
    around: SnowflakeId.optional(),
    // A query string carries text: digits only, so "0x10" or "1e2" is not a number here.
    limit: z
      .union([
        z.number(),
        z
          .string()
          .regex(/^\d{1,3}$/)
          .transform(Number),
      ])
      .pipe(z.number().int().min(1).max(100))
      .default(50),
  })
  .refine(
    (q) => [q.before, q.after, q.around].filter(Boolean).length <= 1,
    'Use only one of before, after, around',
  );
export type MessageHistoryQuery = z.infer<typeof MessageHistoryQuery>;

// REQ-NOTIF-01. last_read_message_id null = nothing read yet. READY sends one per channel I
// can view (chốt 22/11/2026): server_id and last_message_id let the app badge every server
// on the rail without loading its channels.
export const ReadState = z.object({
  channel_id: SnowflakeId,
  server_id: SnowflakeId.nullable(), // null in a DM
  last_read_message_id: SnowflakeId.nullable(),
  last_message_id: SnowflakeId.nullable(),
  mention_count: z.number().int().min(0),
});
export type ReadState = z.infer<typeof ReadState>;

// MESSAGE_ACK: to the sessions of the user who acked only.
export const MessageAck = z.object({
  channel_id: SnowflakeId,
  message_id: SnowflakeId,
  mention_count: z.number().int().min(0),
});
export type MessageAck = z.infer<typeof MessageAck>;

// REQ-MSG-03: the app inserts these tokens, the backend reads them (P2-A4.1).
export const mentionToken = {
  user: (id: string) => `<@${id}>`,
  role: (id: string) => `<@&${id}>`,
  channel: (id: string) => `<#${id}>`,
};

const MENTION =
  /<@(\d{1,20})>|<@&(\d{1,20})>|<#(\d{1,20})>|(?<![\w.@])@(everyone|here)\b/g;

export const parseMentions = (content: string) => {
  const user = new Set<string>();
  const role = new Set<string>();
  const channel = new Set<string>();
  let everyone = false;
  let here = false;
  for (const [, u, r, c, word] of content.matchAll(MENTION)) {
    if (u) user.add(u);
    else if (r) role.add(r);
    else if (c) channel.add(c);
    else if (word === 'everyone') everyone = true;
    else here = true;
  }
  return {
    mention_user_ids: [...user],
    mention_role_ids: [...role],
    mention_channel_ids: [...channel],
    mention_everyone: everyone,
    mention_here: here,
  };
};
