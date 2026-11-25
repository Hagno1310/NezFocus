import { Injectable } from '@nestjs/common';
import { DmRepository } from './dm.repository.js';

// REQ-DM-01: DMs never go through server RBAC. Owner: channels (B); messaging injects this
// (WORKFLOW 4.3) for send, typing, history and ack in a DM.
export abstract class DmAccessPolicy {
  // A person of the DM keeps reading it whatever happens later (block, leaving a server).
  abstract canView(userId: bigint, channelId: bigint): Promise<boolean>;
  // REQ-DM-02 / FRIEND-03: false → 40303, one sentence whatever the reason.
  abstract canSend(senderId: bigint, channelId: bigint): Promise<boolean>;
}

// ponytail: any person of the DM may send until P2-B3.2 (#115) adds blocks and REQ-DM-02.
@Injectable()
export class RecipientDmAccessPolicy extends DmAccessPolicy {
  constructor(private readonly repo: DmRepository) {
    super();
  }

  async canView(userId: bigint, channelId: bigint) {
    return !!(await this.repo.recipients(channelId))?.includes(userId);
  }

  canSend(senderId: bigint, channelId: bigint) {
    return this.canView(senderId, channelId);
  }
}
