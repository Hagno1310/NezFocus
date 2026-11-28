import { Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { friendships, userBlocks } from './friends.schema.js';

// REQ-AUTH-10: the account purge drops every friendship, request and block, both ways.
// Owner: friends (B); called by the account purge (A).
@Injectable()
export class FriendsEraser {
  constructor(@Inject(DB) private readonly db: Db) {}

  async eraseUser(userId: bigint) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(friendships)
        .where(
          or(
            eq(friendships.userIdLow, userId),
            eq(friendships.userIdHigh, userId),
          ),
        );
      await tx
        .delete(userBlocks)
        .where(
          or(
            eq(userBlocks.blockerId, userId),
            eq(userBlocks.blockedId, userId),
          ),
        );
    });
  }
}
