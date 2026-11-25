import { z } from 'zod';
import { MessageAuthor } from '../messages/message.contract.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 DM). Group DM (GDM-*) is v1.x.
export const DmRoutes = {
  // POST CreateDmRequest → 200 DmChannel · REQ-DM-03: the pair's DM if it exists (reopened for
  // the caller, even when they can no longer message: the screen shows `cannot-message`);
  // a new one only when REQ-DM-02 / FRIEND-03 allow, else 40303 · 40401 (no such user, yourself).
  create: '/users/@me/channels',
  // DELETE on a DM 1-1 → 204: closes it for the caller only, messages kept; a new message
  // reopens it (CR-28). On a server channel it deletes it (ChannelRoutes.byId).
  close: '/channels/:id',
} as const;

// REQ-FRIEND-03 AC1 / DM-02: one sentence for every 40303, never saying why.
export const CANNOT_MESSAGE_TEXT = 'Không thể gửi tin nhắn cho người dùng này';

export const CreateDmRequest = z.object({ recipient_id: SnowflakeId });
export type CreateDmRequest = z.infer<typeof CreateDmRequest>;

// deleted: "Tài khoản đã bị xóa" (pending_deletion or deleted, SRS 8.4.6); names are null then.
export const DmRecipient = MessageAuthor.extend({ deleted: z.boolean() });
export type DmRecipient = z.infer<typeof DmRecipient>;

// SRS 8.2 channels type 3. Listed newest last_message_id first (S-DM-01).
export const DmChannel = z.object({
  id: SnowflakeId,
  type: z.literal('dm'),
  recipient: DmRecipient,
  last_message_id: SnowflakeId.nullable(),
});
export type DmChannel = z.infer<typeof DmChannel>;
