import type { DmChannel, DmRecipient } from '@nezfocus/shared';
import { avatarUrls } from '../attachments/media.js';

export type RecipientRow = {
  id: bigint;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  accountStatus: string;
};

// SRS 8.4.6: pending_deletion and deleted both read "Tài khoản đã bị xóa" to others.
export const isDeletedAccount = (status: string) =>
  status === 'pending_deletion' || status === 'deleted';

export const toDmRecipient = (u: RecipientRow): DmRecipient => {
  const deleted = isDeletedAccount(u.accountStatus);
  return {
    id: u.id.toString(),
    username: deleted ? null : u.username,
    display_name: deleted ? null : u.displayName,
    avatar: deleted ? null : avatarUrls(u.avatarKey),
    deleted,
  };
};

export const toDmChannel = (r: {
  channelId: bigint;
  lastMessageId: bigint | null;
  user: RecipientRow;
}): DmChannel => ({
  id: r.channelId.toString(),
  type: 'dm',
  recipient: toDmRecipient(r.user),
  last_message_id: r.lastMessageId?.toString() ?? null,
});
