import { Injectable } from '@nestjs/common';
import { ErrorCode, type DmChannel, type DmRecipient } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { avatarUrls } from '../attachments/media.js';
import { DmRepository } from './dm.repository.js';

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

// REQ-DM-01..03 (SRS 5.3 DM).
@Injectable()
export class DmService {
  constructor(private readonly repo: DmRepository) {}

  // READY private_channels, newest activity first (S-DM-01).
  async openFor(userId: bigint): Promise<DmChannel[]> {
    return (await this.repo.openFor(userId)).map((r) => ({
      id: r.channelId.toString(),
      type: 'dm',
      recipient: toDmRecipient(r.user),
      last_message_id: r.lastMessageId?.toString() ?? null,
    }));
  }

  // DELETE /channels/{id} on a DM 1-1 (CR-28): hide it on my side only. false = not a DM,
  // the caller deletes the server channel instead.
  async close(userId: bigint, channelId: bigint): Promise<boolean> {
    const people = await this.repo.recipients(channelId);
    if (!people) return false;
    if (!people.includes(userId))
      throw new AppError(ErrorCode.NotFound, 'Unknown channel');
    await this.repo.setClosed(channelId, userId, true);
    return true;
  }
}
