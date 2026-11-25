import { z } from 'zod';
import {
  MessageAuthor,
  MessageResponse,
} from '../messages/message.contract.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 DM). Group DM (GDM-*) is v1.x.
export const DmRoutes = {
  // POST → 200 DmChannel (DM-03: the pair's DM, reopened, even if 40303 now) · new: 40303 · 40401
  create: '/users/@me/channels',
  // DELETE → 204, CR-28: hides the DM for the caller only until a new message (cf. ChannelRoutes.byId)
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
  last_message: MessageResponse.nullable(), // S-DM-01 line 2: "Bạn: …", "Đã gửi một ảnh"
});
export type DmChannel = z.infer<typeof DmChannel>;
