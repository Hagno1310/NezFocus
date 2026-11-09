import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import {
  channelPermissionOverwrites,
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
  type ChannelRow,
  type OverwriteRow,
} from '../servers/servers.schema.js';

export type RoleFacts = { id: bigint; permissions: bigint; position: number };
export type MemberFacts = { roleIds: bigint[]; timeoutUntil: Date | null };
export type ServerFacts = {
  ownerId: bigint;
  roles: RoleFacts[]; // @everyone included
  member: MemberFacts | null; // null: the user is not in the server
};
export type ChannelFacts = Pick<
  ChannelRow,
  'id' | 'serverId' | 'type' | 'parentId' | 'permissionsSynced' | 'deletedAt'
>;

// What SRS 8.5.2 reads: the server's roles, the user's membership, a channel's overwrites.
@Injectable()
export class PermissionsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async channel(channelId: bigint): Promise<ChannelFacts | undefined> {
    const [row] = await this.db
      .select({
        id: channels.id,
        serverId: channels.serverId,
        type: channels.type,
        parentId: channels.parentId,
        permissionsSynced: channels.permissionsSynced,
        deletedAt: channels.deletedAt,
      })
      .from(channels)
      .where(eq(channels.id, channelId));
    return row;
  }

  async server(
    serverId: bigint,
    userId: bigint,
  ): Promise<ServerFacts | undefined> {
    const [[server], roleRows, [member], memberRoles] = await Promise.all([
      this.db
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(eq(servers.id, serverId)),
      this.db
        .select({
          id: roles.id,
          permissions: roles.permissions,
          position: roles.position,
        })
        .from(roles)
        .where(eq(roles.serverId, serverId)),
      this.db
        .select({ timeoutUntil: serverMembers.timeoutUntil })
        .from(serverMembers)
        .where(
          and(
            eq(serverMembers.serverId, serverId),
            eq(serverMembers.userId, userId),
          ),
        ),
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
    if (!server) return undefined;
    return {
      ownerId: server.ownerId,
      roles: roleRows,
      member: member
        ? {
            roleIds: memberRoles.map((r) => r.roleId),
            timeoutUntil: member.timeoutUntil,
          }
        : null,
    };
  }

  overwrites(channelIds: bigint[]): Promise<OverwriteRow[]> {
    return this.db
      .select()
      .from(channelPermissionOverwrites)
      .where(inArray(channelPermissionOverwrites.channelId, channelIds));
  }
}
