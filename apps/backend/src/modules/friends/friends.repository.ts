import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { serverMembers, servers } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import {
  FriendshipStatus,
  friendships,
  userBlocks,
  type FriendshipRow,
} from './friends.schema.js';

export type FriendUser = {
  id: bigint;
  username: string;
  displayName: string | null;
  avatarKey: string | null;
  bio: string | null;
};

const userColumns = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarKey: users.avatarKey,
  bio: users.bio,
};

// Someone others can find and befriend: a completed account that is not deleted (SRS 8.4.6).
const findable = and(
  eq(users.accountStatus, 'active'),
  isNotNull(users.username),
);

export const pairKey = (a: bigint, b: bigint) =>
  a < b ? { low: a, high: b } : { low: b, high: a };

const pairWhere = (a: bigint, b: bigint) => {
  const { low, high } = pairKey(a, b);
  return and(eq(friendships.userIdLow, low), eq(friendships.userIdHigh, high));
};

@Injectable()
export class FriendsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async user(id: bigint): Promise<FriendUser | undefined> {
    const [row] = await this.db
      .select(userColumns)
      .from(users)
      .where(and(eq(users.id, id), findable));
    return row as FriendUser | undefined;
  }

  async userByUsername(username: string): Promise<FriendUser | undefined> {
    const [row] = await this.db
      .select(userColumns)
      .from(users)
      .where(and(eq(users.username, username), findable));
    return row as FriendUser | undefined;
  }

  async pair(a: bigint, b: bigint): Promise<FriendshipRow | undefined> {
    const [row] = await this.db
      .select()
      .from(friendships)
      .where(pairWhere(a, b));
    return row;
  }

  async isBlocked(blocker: bigint, blocked: bigint) {
    const [row] = await this.db
      .select({ at: userBlocks.createdAt })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blocker),
          eq(userBlocks.blockedId, blocked),
        ),
      );
    return !!row;
  }

  // false = a row for the pair appeared meanwhile (the PK decides).
  async insertRequest(row: {
    from: bigint;
    to: bigint;
    message: string | null;
    at: Date;
  }) {
    const { low, high } = pairKey(row.from, row.to);
    const inserted = await this.db
      .insert(friendships)
      .values({
        userIdLow: low,
        userIdHigh: high,
        status: FriendshipStatus.pending,
        requestedBy: row.from,
        requestMessage: row.message,
        createdAt: row.at,
      })
      .onConflictDoNothing()
      .returning();
    return inserted.length > 0;
  }

  // Only a request `requestedBy` sent; undefined when it is gone (cancelled meanwhile).
  async accept(requestedBy: bigint, other: bigint, at: Date) {
    const [row] = await this.db
      .update(friendships)
      .set({
        status: FriendshipStatus.accepted,
        requestMessage: null,
        respondedAt: at,
      })
      .where(
        and(
          pairWhere(requestedBy, other),
          eq(friendships.status, FriendshipStatus.pending),
          eq(friendships.requestedBy, requestedBy),
        ),
      )
      .returning();
    return row;
  }

  async deletePair(a: bigint, b: bigint) {
    const [row] = await this.db
      .delete(friendships)
      .where(pairWhere(a, b))
      .returning();
    return row;
  }

  // SRS 8.4.2: any relationship goes, the block stays. Returns the deleted pair row, if any.
  async block(blocker: bigint, blocked: bigint, at: Date) {
    return this.db.transaction(async (tx) => {
      const [gone] = await tx
        .delete(friendships)
        .where(pairWhere(blocker, blocked))
        .returning();
      const added = await tx
        .insert(userBlocks)
        .values({ blockerId: blocker, blockedId: blocked, createdAt: at })
        .onConflictDoNothing()
        .returning();
      return { gone, added: added.length > 0 };
    });
  }

  async unblock(blocker: bigint, blocked: bigint) {
    const rows = await this.db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blocker),
          eq(userBlocks.blockedId, blocked),
        ),
      )
      .returning();
    return rows.length > 0;
  }

  async friendships(userId: bigint) {
    const rows = await this.db
      .select({ pair: friendships, user: userColumns })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(
            eq(friendships.userIdLow, userId),
            eq(users.id, friendships.userIdHigh),
          ),
          and(
            eq(friendships.userIdHigh, userId),
            eq(users.id, friendships.userIdLow),
          ),
        ),
      )
      .where(
        or(
          eq(friendships.userIdLow, userId),
          eq(friendships.userIdHigh, userId),
        ),
      );
    return rows as { pair: FriendshipRow; user: FriendUser }[];
  }

  async blocks(blocker: bigint) {
    const rows = await this.db
      .select({ at: userBlocks.createdAt, user: userColumns })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, blocker));
    return rows as { at: Date; user: FriendUser }[];
  }

  async blockedIds(blocker: bigint) {
    const rows = await this.db
      .select({ id: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, blocker));
    return rows.map((r) => r.id);
  }

  async blockerIds(blocked: bigint) {
    const rows = await this.db
      .select({ id: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, blocked));
    return rows.map((r) => r.id);
  }

  // Read-only look at server_members (module servers, A): sorted by name for S-DM-05.
  async mutualServers(a: bigint, b: bigint) {
    const mine = this.db
      .select({ id: serverMembers.serverId })
      .from(serverMembers)
      .where(eq(serverMembers.userId, a));
    return this.db
      .select({ id: servers.id, name: servers.name })
      .from(serverMembers)
      .innerJoin(servers, eq(servers.id, serverMembers.serverId))
      .where(
        and(eq(serverMembers.userId, b), inArray(serverMembers.serverId, mine)),
      )
      .orderBy(asc(servers.name));
  }
}
