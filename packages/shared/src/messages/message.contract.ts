import { z } from 'zod';
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MessageAttachment,
} from '../attachments/attachment.contract.js';
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
  // REQ-MSG-05 · PATCH EditMessageRequest → MessageResponse · DELETE 204 · 40001, 40302, 40401
  message: '/channels/:id/messages/:messageId',
  // REQ-MSG-05 · PUT / DELETE 204 · 40001, 40029, 40302, 40303 (DM), 40401, 40905 (21st emoji)
  myReaction: '/channels/:id/messages/:messageId/reactions/:emoji/@me',
  // CR-28 #26 · GET → ReactionUsersResponse, oldest first, at most 100 · 40001, 40401
  reaction: '/channels/:id/messages/:messageId/reactions/:emoji',
  // REQ-MSG-10 · GET → MessageListResponse, newest pin first · 40401
  pins: '/channels/:id/pins',
  // REQ-MSG-10 · PUT / DELETE 204 · 40302 (no MANAGE_MESSAGES in a server, a system message,
  // timed out), 40303 (DM), 40401, 40904 (51st pin)
  pin: '/channels/:id/pins/:messageId',
} as const;

// REQ-MSG-10 AC2: at most 50 pinned messages per channel (40904).
export const MAX_PINS = 50;

// REQ-MSG-05: at most 20 different emoji on a message (40905).
export const MAX_REACTION_EMOJI = 20;

const PICTO = /\p{Extended_Pictographic}/gu;
const REGIONAL = /\p{Regional_Indicator}/gu;
const EMOJI_PART =
  /^[\p{Extended_Pictographic}\p{Emoji_Component}⃣️\u{e0020}-\u{e007f}]+$/u;

// One Unicode emoji (custom emoji: Backlog; SRS 8.2 message_reactions.emoji VARCHAR(64)).
// ZWJ sequences, skin tones, flags and keycaps are one; plain text and two emoji are not.
export const isReactionEmoji = (s: string) =>
  s.length > 0 &&
  s.length <= 64 &&
  s.split('‍').every((part) => {
    if (!EMOJI_PART.test(part)) return false;
    const picto = part.match(PICTO)?.length ?? 0;
    const regional = part.match(REGIONAL)?.length ?? 0;
    if (regional) return picto === 0 && regional === 2;
    return picto === 1 || (picto === 0 && part.includes('⃣'));
  });
export const ReactionEmoji = z
  .string()
  .refine(isReactionEmoji, 'not a single emoji');

// `me`: the caller has put this emoji. Order: when each emoji was first put.
export const Reaction = z.object({
  emoji: z.string(),
  count: z.number().int().min(1),
  me: z.boolean(),
});
export type Reaction = z.infer<typeof Reaction>;

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

export const ReactionUsersResponse = z.array(MessageAuthor);
export type ReactionUsersResponse = z.infer<typeof ReactionUsersResponse>;

// REQ-MSG-05 Reply: what the reply line shows.
export const ReferencedMessage = z.object({
  id: SnowflakeId,
  author: MessageAuthor,
  content: z.string(),
});
export type ReferencedMessage = z.infer<typeof ReferencedMessage>;

const messageFields = {
  id: SnowflakeId,
  channel_id: SnowflakeId,
  author: MessageAuthor,
  content: z.string(),
  nonce: z.string().nullable(), // REQ-MSG-09: the sender's, so a pending copy can be matched
  mention_user_ids: z.array(SnowflakeId),
  mention_role_ids: z.array(SnowflakeId),
  mention_everyone: z.boolean(),
  // REQ-MSG-05 AC6: reply_to_id set and referenced_message null = "Tin nhắn gốc đã bị xóa".
  reply_to_id: SnowflakeId.nullable(),
  referenced_message: ReferencedMessage.nullable().default(null),
  reactions: z.array(Reaction).default([]), // none on MESSAGE_CREATE
  attachments: z.array(MessageAttachment).default([]), // REQ-MSG-04, in upload order
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
  z.object({
    ...messageFields,
    type: z.literal('channel_pinned'), // REQ-MSG-10: author = who pinned
    system_data: z.object({ message_id: SnowflakeId }),
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
const MessageContent = z
  .string()
  .transform((s) => s.normalize('NFC'))
  .pipe(
    z
      .string()
      .refine(
        (s) => countMessageChars(s) <= MESSAGE_MAX_CHARS,
        `at most ${MESSAGE_MAX_CHARS} characters`,
      ),
  );

export const CreateMessageRequest = z
  .object({
    content: MessageContent,
    nonce: ClientRequestId,
    // REQ-MSG-05: a message of this channel, not a system one (40001); a deleted one is fine.
    reply_to_id: SnowflakeId.optional(),
    // REQ-MSG-04 AC5: completed images of mine for this channel, not yet sent (else 40001).
    attachment_ids: z
      .array(SnowflakeId)
      .max(MAX_ATTACHMENTS_PER_MESSAGE)
      .refine((ids) => new Set(ids).size === ids.length, 'duplicate id')
      .optional(),
  })
  // MSG-01 AC2: refused when empty and no file.
  .refine((b) => b.content.trim() !== '' || !!b.attachment_ids?.length, {
    message: 'Message is empty',
    path: ['content'],
  });
export type CreateMessageRequest = z.infer<typeof CreateMessageRequest>;

// REQ-MSG-05. Saving it empty is a delete on the app (S-HOME-01 `edit-mode`), never here.
export const EditMessageRequest = z
  .object({ content: MessageContent })
  .refine((b) => b.content.trim() !== '', {
    message: 'Message is empty',
    path: ['content'],
  });
export type EditMessageRequest = z.infer<typeof EditMessageRequest>;

// MESSAGE_UPDATE (REQ-MSG-05 AC1): what an edit changes, to who can view the channel.
export const MessageUpdateEvent = z.object({
  id: SnowflakeId,
  channel_id: SnowflakeId,
  server_id: SnowflakeId.nullable(),
  content: z.string(),
  mention_user_ids: z.array(SnowflakeId),
  mention_role_ids: z.array(SnowflakeId),
  mention_everyone: z.boolean(),
  edited_at: z.iso.datetime(),
});
export type MessageUpdateEvent = z.infer<typeof MessageUpdateEvent>;

// MESSAGE_DELETE (AC3): soft-deleted, gone for everyone.
export const MessageDeleteEvent = z.object({
  id: SnowflakeId,
  channel_id: SnowflakeId,
  server_id: SnowflakeId.nullable(),
});
export type MessageDeleteEvent = z.infer<typeof MessageDeleteEvent>;

// MESSAGE_REACTION_ADD / REMOVE: the app sets `me` when user_id is the signed-in user.
export const MessageReactionEvent = z.object({
  user_id: SnowflakeId,
  channel_id: SnowflakeId,
  message_id: SnowflakeId,
  server_id: SnowflakeId.nullable(),
  emoji: z.string(),
});
export type MessageReactionEvent = z.infer<typeof MessageReactionEvent>;

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

// CHANNEL_PINS_UPDATE (REQ-MSG-10 AC1, CR-28 #28): to who can view the channel.
export const ChannelPinsUpdateEvent = z.object({
  channel_id: SnowflakeId,
  server_id: SnowflakeId.nullable(),
  message_id: SnowflakeId,
  pinned_at: z.iso.datetime().nullable(), // null: unpinned. A deleted pin: MESSAGE_DELETE only
});
export type ChannelPinsUpdateEvent = z.infer<typeof ChannelPinsUpdateEvent>;
