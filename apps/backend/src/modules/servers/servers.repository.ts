import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { messages, readStates } from '../messaging/messages.schema.js';
import { userServerSettings } from '../users/user-server-settings.schema.js';
import { users } from '../users/users.schema.js';
import {
  withOverwrites,
  type ChannelWithOverwrites,
} from './channels.repository.js';
import type { ServerRows } from './server-templates.js';
import {
  channelPermissionOverwrites,
  channels,
  invites,
  roles,
  serverBans,
  serverMemberRoles,
  serverMembers,
  servers,
  type ChannelRow,
  type RoleRow,
  ChannelTypeCode,
  type ServerRow,
} from './servers.schema.js';

export type ServerWithCount = ServerRow & { memberCount: number };
export type FullServer = ServerWithCount & {
  channels: ChannelWithOverwrites[];
  roles: RoleRow[];
  myRoleIds: bigint[]; // the caller's roles, without @everyone
  myTimeoutUntil: Date | null; // REQ-ROLE-05
};

const memberCount = sql<number>`(SELECT count(*)::int FROM ${serverMembers} WHERE ${serverMembers.serverId} = ${servers.id})`;

@Injectable()
export class ServersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // false: the owner is already in `limit` servers (40011). The user row lock makes two
  // creates at limit − 1 run one after the other, so only one of them passes.
  async create(rows: ServerRows, limit: number): Promise<boolean> {
    const { server, ownerRoleIds } = rows;
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, server.ownerId))
        .for('update');
      const [joined] = await tx
        .select({ n: count() })
        .from(serverMembers)
        .innerJoin(servers, eq(servers.id, serverMembers.serverId))
        .where(
          and(
            eq(serverMembers.userId, server.ownerId),
            isNull(servers.deletedAt),
          ),
        );
      if (joined!.n >= limit) return false;

      // The welcome channel does not exist yet: point at it once the channels are in.
      await tx.insert(servers).values({ ...server, systemChannelId: null });
      await tx.insert(roles).values(rows.roles);
      await tx.insert(channels).values(rows.channels);
      if (rows.overwrites.length)
        await tx.insert(channelPermissionOverwrites).values(rows.overwrites);
      await tx.insert(serverMembers).values({
        serverId: server.id,
        userId: server.ownerId,
        joinedAt: server.createdAt,
      });
      if (ownerRoleIds.length)
        await tx.insert(serverMemberRoles).values(
          ownerRoleIds.map((roleId) => ({
            serverId: server.id,
            userId: server.ownerId,
            roleId,
          })),
        );
      if (server.systemChannelId)
        await tx
          .update(servers)
          .set({ systemChannelId: server.systemChannelId })
          .where(eq(servers.id, server.id));
      return true;
    });
  }

  // READY: oldest joined first, the order of the S-HOME-02 rail.
  summariesForUser(userId: bigint): Promise<ServerWithCount[]> {
    return this.db
      .select({ server: servers, memberCount })
      .from(serverMembers)
      .innerJoin(servers, eq(servers.id, serverMembers.serverId))
      .where(and(eq(serverMembers.userId, userId), isNull(servers.deletedAt)))
      .orderBy(asc(serverMembers.joinedAt), asc(servers.id))
      .then((r) => r.map((x) => ({ ...x.server, memberCount: x.memberCount })));
  }

  async summary(serverId: bigint): Promise<ServerWithCount | undefined> {
    const [row] = await this.db
      .select({ server: servers, memberCount })
      .from(servers)
      .where(and(eq(servers.id, serverId), isNull(servers.deletedAt)));
    return row && { ...row.server, memberCount: row.memberCount };
  }

  // A soft-deleted server has no members as far as any caller is concerned (SRV-05 AC4).
  async isMember(serverId: bigint, userId: bigint) {
    const [row] = await this.db
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .innerJoin(servers, eq(servers.id, serverMembers.serverId))
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
          isNull(servers.deletedAt),
        ),
      );
    return !!row;
  }

  // undefined: no such server, or the user is not a member (40401 either way).
  async findForMember(
    serverId: bigint,
    userId: bigint,
  ): Promise<FullServer | undefined> {
    if (!(await this.isMember(serverId, userId))) return undefined;
    const server = await this.summary(serverId);
    if (!server) return undefined;
    const [channelRows, roleRows, myRoles, [mine]] = await Promise.all([
      this.db
        .select()
        .from(channels)
        .where(and(eq(channels.serverId, serverId), isNull(channels.deletedAt)))
        .orderBy(asc(channels.position), asc(channels.id)),
      this.db
        .select()
        .from(roles)
        .where(eq(roles.serverId, serverId))
        .orderBy(asc(roles.position), asc(roles.id)),
      this.db
        .select({ roleId: serverMemberRoles.roleId })
        .from(serverMemberRoles)
        .where(
          and(
            eq(serverMemberRoles.serverId, serverId),
            eq(serverMemberRoles.userId, userId),
          ),
        ),
      this.db
        .select({ timeoutUntil: serverMembers.timeoutUntil })
        .from(serverMembers)
        .where(
          and(
            eq(serverMembers.serverId, serverId),
            eq(serverMembers.userId, userId),
          ),
        ),
    ]);
    return {
      ...server,
      channels: await withOverwrites(this.db, channelRows),
      roles: roleRows,
      myRoleIds: myRoles.map((r) => r.roleId),
      myTimeoutUntil: mine?.timeoutUntil ?? null,
    };
  }

  // Live channels only: a soft-deleted channel is gone for every caller.
  async findChannel(channelId: bigint): Promise<ChannelRow | undefined> {
    const [row] = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), isNull(channels.deletedAt)));
    return row;
  }

  async memberIds(serverId: bigint): Promise<bigint[]> {
    const rows = await this.db
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(eq(serverMembers.serverId, serverId));
    return rows.map((r) => r.userId);
  }

  async update(
    serverId: bigint,
    patch: {
      name?: string;
      systemChannelId?: bigint | null;
      iconKey?: string | null;
    },
  ) {
    await this.db.update(servers).set(patch).where(eq(servers.id, serverId));
  }

  // false: not a member any more (left twice, or kicked meanwhile).
  async removeMember(serverId: bigint, userId: bigint): Promise<boolean> {
    const gone = await this.db
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

  // The row whatever its state: restore and the Owner checks need a deleted server too.
  async findAny(serverId: bigint): Promise<ServerRow | undefined> {
    const [row] = await this.db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId));
    return row;
  }

  async voiceChannelIds(serverId: bigint): Promise<bigint[]> {
    const rows = await this.db
      .select({ id: channels.id })
      .from(channels)
      .where(
        and(
          eq(channels.serverId, serverId),
          eq(channels.type, ChannelTypeCode.voice),
          isNull(channels.deletedAt),
        ),
      );
    return rows.map((r) => r.id);
  }

  // false: already deleted (two taps, two devices).
  async softDelete(serverId: bigint, at: Date): Promise<boolean> {
    const done = await this.db
      .update(servers)
      .set({ deletedAt: at })
      .where(and(eq(servers.id, serverId), isNull(servers.deletedAt)))
      .returning({ id: servers.id });
    return done.length > 0;
  }

  // false: not deleted, or deleted before `since` (30 days are over).
  async restore(serverId: bigint, since: Date): Promise<boolean> {
    const done = await this.db
      .update(servers)
      .set({ deletedAt: null })
      .where(and(eq(servers.id, serverId), gt(servers.deletedAt, since)))
      .returning({ id: servers.id });
    return done.length > 0;
  }

  // 02 S-HOME-06 `restore-list`: newest deletion first.
  deletedOwnedBy(ownerId: bigint, since: Date): Promise<ServerRow[]> {
    return this.db
      .select()
      .from(servers)
      .where(and(eq(servers.ownerId, ownerId), gt(servers.deletedAt, since)))
      .orderBy(desc(servers.deletedAt));
  }

  // REQ-SRV-05 AC1, in one statement so a recipient who just left cannot become Owner.
  // 'not_member' covers a server that is gone; 'not_owner' a transfer already done elsewhere.
  async transferOwner(
    serverId: bigint,
    fromId: bigint,
    toId: bigint,
  ): Promise<'ok' | 'not_owner' | 'not_member'> {
    return this.db.transaction(async (tx) => {
      const [server] = await tx
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(and(eq(servers.id, serverId), isNull(servers.deletedAt)))
        .for('update');
      if (server?.ownerId !== fromId) return 'not_owner';
      const [member] = await tx
        .select({ userId: serverMembers.userId })
        .from(serverMembers)
        .where(
          and(
            eq(serverMembers.serverId, serverId),
            eq(serverMembers.userId, toId),
          ),
        )
        .for('update');
      if (!member) return 'not_member';
      await tx
        .update(servers)
        .set({ ownerId: toId })
        .where(eq(servers.id, serverId));
      return 'ok';
    });
  }

  // SRS 8.6 (CR-28 #42): what a server deleted before `cutoff` still holds goes; the server
  // and channel rows stay so focus_sessions and study history keep their room. A deleted
  // server keeps its Owner as a member until then, so "has members" marks the unpurged ones.
  purgeDeletedBefore(cutoff: Date): Promise<bigint[]> {
    return this.purgeWhere(lte(servers.deletedAt, cutoff));
  }

  // REQ-AUTH-10: the servers deleted with an account go with its purge, not 16 days later.
  purgeDeletedWith(ownerId: bigint, at: Date): Promise<bigint[]> {
    return this.purgeWhere(
      and(eq(servers.ownerId, ownerId), eq(servers.deletedAt, at))!,
    );
  }

  private async purgeWhere(match: SQL): Promise<bigint[]> {
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select({ id: servers.id, deletedAt: servers.deletedAt })
        .from(servers)
        .where(
          and(
            match,
            sql`EXISTS (SELECT 1 FROM ${serverMembers} WHERE ${serverMembers.serverId} = ${servers.id})`,
          ),
        );
      const ids = due.map((r) => r.id);
      if (!ids.length) return ids;
      const channelIds = tx
        .select({ id: channels.id })
        .from(channels)
        .where(inArray(channels.serverId, ids));
      await tx
        .delete(serverMembers)
        .where(inArray(serverMembers.serverId, ids));
      await tx
        .delete(roles)
        .where(and(inArray(roles.serverId, ids), ne(roles.id, roles.serverId)));
      await tx.delete(serverBans).where(inArray(serverBans.serverId, ids));
      await tx.delete(invites).where(inArray(invites.serverId, ids));
      await tx
        .delete(userServerSettings)
        .where(inArray(userServerSettings.serverId, ids));
      await tx
        .delete(channelPermissionOverwrites)
        .where(inArray(channelPermissionOverwrites.channelId, channelIds));
      await tx
        .delete(readStates)
        .where(inArray(readStates.channelId, channelIds));
      // Soft-deleted with the server's date, so the attachment sweep takes their files now.
      for (const { id, deletedAt } of due)
        await tx
          .update(messages)
          .set({ deletedAt })
          .where(
            and(
              isNull(messages.deletedAt),
              inArray(
                messages.channelId,
                tx
                  .select({ id: channels.id })
                  .from(channels)
                  .where(eq(channels.serverId, id)),
              ),
            ),
          );
      await tx
        .update(servers)
        .set({ iconKey: null, systemChannelId: null })
        .where(inArray(servers.id, ids));
      return ids;
    });
  }
}
