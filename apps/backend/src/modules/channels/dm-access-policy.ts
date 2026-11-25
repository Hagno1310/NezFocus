import { Injectable } from '@nestjs/common';
import { BlockQuery } from '../friends/block-query.js';
import { SettingsService } from '../users/settings.service.js';
import { DmRepository } from './dm.repository.js';
import { isDeletedAccount } from './dm.dto.js';

// REQ-DM-01: DMs never go through server RBAC (WORKFLOW 4.3; owner channels, B).
export abstract class DmAccessPolicy {
  // A person of the DM keeps reading it whatever happens later (block, leaving a server).
  abstract canView(userId: bigint, channelId: bigint): Promise<boolean>;
  // REQ-DM-02 / FRIEND-03: false → 40303, one sentence whatever the reason.
  abstract canSend(senderId: bigint, channelId: bigint): Promise<boolean>;
  // The same rule between two people, before any DM exists (create, profile can_message).
  abstract canMessage(senderId: bigint, recipientId: bigint): Promise<boolean>;
}

@Injectable()
export class DbDmAccessPolicy extends DmAccessPolicy {
  constructor(
    private readonly repo: DmRepository,
    private readonly blocks: BlockQuery,
    private readonly settings: SettingsService,
  ) {
    super();
  }

  async canView(userId: bigint, channelId: bigint) {
    return !!(await this.repo.recipients(channelId))?.includes(userId);
  }

  async canSend(senderId: bigint, channelId: bigint) {
    const people = await this.repo.recipients(channelId);
    const other = people?.find((id) => id !== senderId);
    return (
      !!other &&
      !!people?.includes(senderId) &&
      this.canMessage(senderId, other)
    );
  }

  async canMessage(senderId: bigint, recipientId: bigint) {
    if (senderId === recipientId) return false;
    const recipient = await this.repo.user(recipientId);
    if (!recipient || isDeletedAccount(recipient.accountStatus)) return false;
    // FRIEND-03 AC1: either way, and the blocker cannot message until they unblock (AC3).
    if (await this.blocks.isBlockedEitherWay(senderId, recipientId))
      return false;
    if (await this.repo.areFriends(senderId, recipientId)) return true;
    // REQ-DM-02: a shared server, unless the recipient turned DMs from members off.
    const shared = await this.repo.sharedServers(recipientId, senderId);
    return (
      shared.length > 0 &&
      this.settings.acceptsDmFromServerMembers(
        recipientId,
        shared.map((s) => s.id),
      )
    );
  }
}
