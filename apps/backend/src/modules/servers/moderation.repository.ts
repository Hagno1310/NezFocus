import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import { users } from '../users/users.schema.js';
import { serverBans, serverMembers } from './servers.schema.js';

export type BanRow = {
  userId: bigint;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  reason: string | null;
  createdAt: Date;
  bannedBy: {
    id: bigint;
    username: string | null;
    displayName: string | null;
  } | null;
};

const banner = alias(users, 'banner');

// REQ-ROLE-05 / 07: timeouts, removals and bans. Writes take the transaction of
// RolesRepository.locked, so the hierarchy read and the write see the same roles.
@Injectable()
export class ModerationRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async setTimeout(
    tx: Tx,
    serverId: bigint,
    userId: bigint,
    until: Date | null,
    reason: string | null,
  ) {
    await tx
      .update(serverMembers)
      .set({ timeoutUntil: until, timeoutReason: reason })
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
  }

  async timeoutOf(tx: Tx, serverId: bigint, userId: bigint) {
    const [row] = await tx
      .select({
        until: serverMembers.timeoutUntil,
        reason: serverMembers.timeoutReason,
      })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
    return row;
  }

  // Their roles go by FK cascade. false = they were not in the server.
  async remove(tx: Tx, serverId: bigint, userId: bigint) {
    const gone = await tx
      .delete(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      )
      .returning({ userId: serverMembers.userId });
    return gone.length > 0;
  }

  // false = already banned (the first reason stays).
  async ban(
    tx: Tx,
    row: {
      serverId: bigint;
      userId: bigint;
      bannedBy: bigint;
      reason: string | null;
    },
  ) {
    const added = await tx
      .insert(serverBans)
      .values(row)
      .onConflictDoNothing()
      .returning({ userId: serverBans.userId });
    return added.length > 0;
  }

  async unban(serverId: bigint, userId: bigint) {
    const gone = await this.db
      .delete(serverBans)
      .where(
        and(eq(serverBans.serverId, serverId), eq(serverBans.userId, userId)),
      )
      .returning({ reason: serverBans.reason });
    return gone[0];
  }

  async userExists(userId: bigint) {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));
    return !!row;
  }

  // REQ-ROLE-07 (CR-17): newest ban first.
  // ponytail: khi một server có > 1000 người bị cấm: lọc `q` và phân trang trong SQL.
  async bans(serverId: bigint, userId?: bigint): Promise<BanRow[]> {
    const rows = await this.db
      .select({
        userId: serverBans.userId,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
        reason: serverBans.reason,
        createdAt: serverBans.createdAt,
        bannerId: banner.id,
        bannerUsername: banner.username,
        bannerName: banner.displayName,
      })
      .from(serverBans)
      .innerJoin(users, eq(users.id, serverBans.userId))
      .leftJoin(banner, eq(banner.id, serverBans.bannedBy))
      .where(
        userId === undefined
          ? eq(serverBans.serverId, serverId)
          : and(
              eq(serverBans.serverId, serverId),
              eq(serverBans.userId, userId),
            ),
      )
      .orderBy(desc(serverBans.createdAt), desc(serverBans.userId));
    return rows.map((r) => ({
      userId: r.userId,
      username: r.username,
      displayName: r.displayName,
      avatarKey: r.avatarKey,
      reason: r.reason,
      createdAt: r.createdAt,
      bannedBy:
        r.bannerId === null
          ? null
          : {
              id: r.bannerId,
              username: r.bannerUsername,
              displayName: r.bannerName,
            },
    }));
  }
}
