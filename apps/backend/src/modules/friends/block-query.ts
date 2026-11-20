import { Injectable } from '@nestjs/common';
import { FriendsRepository } from './friends.repository.js';

// REQ-FRIEND-03. Owner: friends (B). Other modules inject this (WORKFLOW 4.3) to hide what a
// block hides: DMs (P2-B3.2 #115), blocked messages (P2-A4.3 #105), push (P3-B5 #29).
export abstract class BlockQuery {
  // Either A blocked B or B blocked A.
  abstract isBlockedEitherWay(a: bigint, b: bigint): Promise<boolean>;
  // The people userId blocked.
  abstract blockedIds(userId: bigint): Promise<bigint[]>;
  // The people who blocked userId: to filter what reaches them, never shown to userId.
  abstract blockerIds(userId: bigint): Promise<bigint[]>;
}

@Injectable()
export class DbBlockQuery extends BlockQuery {
  constructor(private readonly repo: FriendsRepository) {
    super();
  }

  async isBlockedEitherWay(a: bigint, b: bigint) {
    return (await this.repo.isBlocked(a, b)) || this.repo.isBlocked(b, a);
  }

  blockedIds(userId: bigint) {
    return this.repo.blockedIds(userId);
  }

  blockerIds(userId: bigint) {
    return this.repo.blockerIds(userId);
  }
}
