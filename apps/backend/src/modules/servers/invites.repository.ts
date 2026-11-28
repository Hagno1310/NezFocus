import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { users } from '../users/users.schema.js';
import { isLive } from './invite-rules.js';
import {
  channels,
  invites,
  serverBans,
  serverMembers,
  servers,
  type InviteRow,
} from './servers.schema.js';

export type AcceptResult =
  'joined' | 'member' | 'invalid' | 'banned' | 'max-servers';

export type InviteUser = {
  id: bigint;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
};

export type PreviewData = {
  server: { id: bigint; name: string; iconKey: string | null };
  memberIds: bigint[];
  creator: {
    displayName: string | null;
    username: string | null;
    avatarKey: string | null;
    active: boolean; // not pending deletion or deleted
    member: boolean;
  } | null;
};

export type ListedInvite = InviteRow & {
  creator: Pick<InviteUser, 'id' | 'username' | 'displayName'> | null;
};

@Injectable()
export class InvitesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async find(code: string): Promise<InviteRow | undefined> {
    const [row] = await this.db
      .select()
      .from(invites)
      .where(eq(invites.code, code));
    return row;
  }

  ownInvites(creatorId: bigint, channelId: bigint): Promise<InviteRow[]> {
    return this.db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.creatorId, creatorId),
          eq(invites.channelId, channelId),
          isNull(invites.revokedAt),
        ),
      )
      .orderBy(desc(invites.createdAt));
  }

  // false: the code is taken (the caller draws another one).
  async insert(row: InviteRow): Promise<boolean> {
    const done = await this.db
      .insert(invites)
      .values(row)
      .onConflictDoNothing()
      .returning({ code: invites.code });
    return done.length > 0;
  }

  async revoke(code: string, at: Date) {
    await this.db
      .update(invites)
      .set({ revokedAt: at })
      .where(and(eq(invites.code, code), isNull(invites.revokedAt)));
  }

  async channel(id: bigint) {
    const [row] = await this.db
      .select({
        id: channels.id,
        serverId: channels.serverId,
        name: channels.name,
        type: channels.type,
      })
      .from(channels)
      .where(and(eq(channels.id, id), isNull(channels.deletedAt)));
    return row?.serverId ? { ...row, serverId: row.serverId } : undefined;
  }

  async isMember(serverId: bigint, userId: bigint) {
    const [row] = await this.db
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
    return !!row;
  }

  async preview(invite: InviteRow): Promise<PreviewData> {
    const [[server], members, [creator]] = await Promise.all([
      this.db
        .select({
          id: servers.id,
          name: servers.name,
          iconKey: servers.iconKey,
        })
        .from(servers)
        .where(eq(servers.id, invite.serverId)),
      this.db
        .select({ userId: serverMembers.userId })
        .from(serverMembers)
        .where(eq(serverMembers.serverId, invite.serverId)),
      invite.creatorId
        ? this.db
            .select({
              id: users.id,
              displayName: users.displayName,
              username: users.username,
              avatarKey: users.avatarKey,
              status: users.accountStatus,
            })
            .from(users)
            .where(eq(users.id, invite.creatorId))
        : Promise.resolve([]),
    ]);
    const memberIds = members.map((m) => m.userId);
    return {
      server: server!,
      memberIds,
      creator: creator
        ? {
            displayName: creator.displayName,
            username: creator.username,
            avatarKey: creator.avatarKey,
            active: creator.status === 'active',
            member: memberIds.includes(creator.id),
          }
        : null,
    };
  }

  async user(id: bigint): Promise<InviteUser> {
    const [row] = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
      })
      .from(users)
      .where(eq(users.id, id));
    return row!;
  }

  // REQ-SRV-04: one transaction. The invite row lock makes two accepts of the same user (or
  // the last use racing) run one after the other; the user row lock does the same for the
  // 100-server count with a parallel create or join.
  accept(
    code: string,
    userId: bigint,
    now: Date,
    limit: number,
  ): Promise<AcceptResult> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(invites)
        .where(eq(invites.code, code))
        .for('update');
      if (!row) return 'invalid';
      // Membership first: the second of two quick taps finds a 1-use invite used up by the first.
      const [member] = await tx
        .select({ userId: serverMembers.userId })
        .from(serverMembers)
        .where(
          and(
            eq(serverMembers.serverId, row.serverId),
            eq(serverMembers.userId, userId),
          ),
        );
      if (member) return 'member';
      if (!isLive(row, now)) return 'invalid';
      const [ban] = await tx
        .select({ userId: serverBans.userId })
        .from(serverBans)
        .where(
          and(
            eq(serverBans.serverId, row.serverId),
            eq(serverBans.userId, userId),
          ),
        );
      if (ban) return 'banned';
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      const [joined] = await tx
        .select({ n: count() })
        .from(serverMembers)
        .where(eq(serverMembers.userId, userId));
      if (joined!.n >= limit) return 'max-servers';
      // Two invites to the same server accepted at once: the second finds the row taken.
      const added = await tx
        .insert(serverMembers)
        .values({ serverId: row.serverId, userId, joinedAt: now })
        .onConflictDoNothing()
        .returning({ userId: serverMembers.userId });
      if (!added.length) return 'member';
      await tx
        .update(invites)
        .set({ uses: sql`${invites.uses} + 1` })
        .where(eq(invites.code, code));
      return 'joined';
    });
  }

  // REQ-SRV-03 v1.7: live ones (not revoked, not expired, uses left), newest first.
  // ponytail: khi một server có > 100 lời mời còn hiệu lực: phân trang (S-SET-04 › "Rất nhiều lời mời", cursor như danh sách cấm).
  async liveForServer(serverId: bigint, now: Date): Promise<ListedInvite[]> {
    const rows = await this.db
      .select({
        invite: invites,
        creatorId: users.id,
        username: users.username,
        displayName: users.displayName,
      })
      .from(invites)
      .leftJoin(users, eq(users.id, invites.creatorId))
      .where(
        and(
          eq(invites.serverId, serverId),
          isNull(invites.revokedAt),
          or(isNull(invites.expiresAt), gt(invites.expiresAt, now)),
          or(eq(invites.maxUses, 0), gt(invites.maxUses, invites.uses)),
        ),
      )
      .orderBy(desc(invites.createdAt));
    return rows.map((r) => ({
      ...r.invite,
      creator: r.creatorId
        ? { id: r.creatorId, username: r.username, displayName: r.displayName }
        : null,
    }));
  }
}
