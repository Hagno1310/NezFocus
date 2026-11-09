import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { users } from '../users/users.schema.js';
import type { ServerRows } from './server-templates.js';
import {
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
  type ChannelRow,
  type RoleRow,
  type ServerRow,
} from './servers.schema.js';

export type ServerWithCount = ServerRow & { memberCount: number };
export type FullServer = ServerWithCount & {
  channels: ChannelRow[];
  roles: RoleRow[];
  myRoleIds: bigint[]; // the caller's roles, without @everyone
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
        .where(eq(serverMembers.userId, server.ownerId));
      if (joined!.n >= limit) return false;

      // The welcome channel does not exist yet: point at it once the channels are in.
      await tx.insert(servers).values({ ...server, systemChannelId: null });
      await tx.insert(roles).values(rows.roles);
      await tx.insert(channels).values(rows.channels);
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
      .where(eq(serverMembers.userId, userId))
      .orderBy(asc(serverMembers.joinedAt), asc(servers.id))
      .then((r) => r.map((x) => ({ ...x.server, memberCount: x.memberCount })));
  }

  async summary(serverId: bigint): Promise<ServerWithCount | undefined> {
    const [row] = await this.db
      .select({ server: servers, memberCount })
      .from(servers)
      .where(eq(servers.id, serverId));
    return row && { ...row.server, memberCount: row.memberCount };
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

  // undefined: no such server, or the user is not a member (40401 either way).
  async findForMember(
    serverId: bigint,
    userId: bigint,
  ): Promise<FullServer | undefined> {
    if (!(await this.isMember(serverId, userId))) return undefined;
    const server = await this.summary(serverId);
    if (!server) return undefined;
    const [channelRows, roleRows, myRoles] = await Promise.all([
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
    ]);
    return {
      ...server,
      channels: channelRows,
      roles: roleRows,
      myRoleIds: myRoles.map((r) => r.roleId),
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
    patch: { name?: string; systemChannelId?: bigint | null },
  ) {
    await this.db.update(servers).set(patch).where(eq(servers.id, serverId));
  }
}
