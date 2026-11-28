import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { invites, serverMembers, servers } from '../servers/servers.schema.js';
import { users } from './users.schema.js';

export type OwnedServerRow = {
  id: bigint;
  name: string;
  iconKey: string | null;
  memberCount: number;
};

const memberCount = sql<number>`(SELECT count(*)::int FROM ${serverMembers} WHERE ${serverMembers.serverId} = ${servers.id})`;

// REQ-AUTH-10: the account's way into pending_deletion, back out, and the purge 14 days on.
@Injectable()
export class AccountDeletionRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Live servers the user owns, oldest first.
  owned(userId: bigint): Promise<OwnedServerRow[]> {
    return this.db
      .select({
        id: servers.id,
        name: servers.name,
        iconKey: servers.iconKey,
        memberCount,
      })
      .from(servers)
      .where(and(eq(servers.ownerId, userId), isNull(servers.deletedAt)))
      .orderBy(asc(servers.createdAt), asc(servers.id));
  }

  // false: not active (already pending, or a server gained a member meanwhile → 40010 again).
  // The solo servers go with the same timestamp, so a cancel finds exactly them (AC4); their
  // invites are revoked for good (AC7).
  async request(
    userId: bigint,
    soloIds: bigint[],
    at: Date,
  ): Promise<'ok' | 'not_active' | 'not_solo'> {
    return this.db.transaction(async (tx) => {
      const [me] = await tx
        .select({ status: users.accountStatus })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (me?.status !== 'active') return 'not_active';
      if (soloIds.length) {
        const still = await tx
          .select({ id: servers.id, memberCount })
          .from(servers)
          .where(inArray(servers.id, soloIds))
          .for('update');
        if (still.some((s) => s.memberCount > 1)) return 'not_solo';
        await tx
          .update(servers)
          .set({ deletedAt: at })
          .where(and(inArray(servers.id, soloIds), isNull(servers.deletedAt)));
        await tx
          .update(invites)
          .set({ revokedAt: at })
          .where(
            and(inArray(invites.serverId, soloIds), isNull(invites.revokedAt)),
          );
      }
      await tx
        .update(users)
        .set({
          accountStatus: 'pending_deletion',
          deletionRequestedAt: at,
          updatedAt: at,
        })
        .where(eq(users.id, userId));
      return 'ok';
    });
  }

  // AC4: back to active; the servers deleted with the account come back (not the invites).
  async cancel(userId: bigint, at: Date): Promise<bigint[]> {
    return this.db.transaction(async (tx) => {
      const [me] = await tx
        .select({
          status: users.accountStatus,
          requestedAt: users.deletionRequestedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (me?.status !== 'pending_deletion' || !me.requestedAt) return [];
      await tx
        .update(users)
        .set({
          accountStatus: 'active',
          deletionRequestedAt: null,
          updatedAt: at,
        })
        .where(eq(users.id, userId));
      const back = await tx
        .update(servers)
        .set({ deletedAt: null })
        .where(
          and(
            eq(servers.ownerId, userId),
            eq(servers.deletedAt, me.requestedAt),
          ),
        )
        .returning({ id: servers.id });
      return back.map((s) => s.id);
    });
  }

  async due(cutoff: Date): Promise<bigint[]> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.accountStatus, 'pending_deletion'),
          lte(users.deletionRequestedAt, cutoff),
        ),
      );
    return rows.map((r) => r.id);
  }

  // AC3: PII gone (the username freed, CR-28 #41), out of every server. Messages stay with
  // their author id ("Tài khoản đã bị xóa"). Returns the servers left.
  async erase(userId: bigint, at: Date): Promise<bigint[]> {
    return this.db.transaction(async (tx) => {
      const done = await tx
        .update(users)
        .set({
          accountStatus: 'deleted',
          email: null,
          username: null,
          displayName: null,
          passwordHash: null,
          avatarKey: null,
          bio: null,
          updatedAt: at,
        })
        .where(
          and(
            eq(users.id, userId),
            eq(users.accountStatus, 'pending_deletion'),
          ),
        )
        .returning({ id: users.id });
      if (!done.length) return [];
      // A server deleted with the account keeps me until its own purge (SRS 8.6), which
      // empties it then; leaving now would hide it from that purge.
      const left = await tx
        .delete(serverMembers)
        .where(
          and(
            eq(serverMembers.userId, userId),
            inArray(
              serverMembers.serverId,
              tx
                .select({ id: servers.id })
                .from(servers)
                .where(isNull(servers.deletedAt)),
            ),
          ),
        )
        .returning({ serverId: serverMembers.serverId });
      return left.map((m) => m.serverId);
    });
  }
}
