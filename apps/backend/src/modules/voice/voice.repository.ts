import { Inject, Injectable } from '@nestjs/common';
import type { PermissionMember, PermissionServer } from '@nezfocus/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import {
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
} from '../servers/servers.schema.js';

@Injectable()
export class VoiceRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async serverIdsOf(userId: bigint): Promise<bigint[]> {
    const rows = await this.db
      .select({ serverId: serverMembers.serverId })
      .from(serverMembers)
      .where(eq(serverMembers.userId, userId));
    return rows.map((r) => r.serverId);
  }

  // REQ-VC-04 AC5. Not a member → false (the token check refuses them anyway).
  async modMuted(serverId: bigint, userId: bigint): Promise<boolean> {
    const [row] = await this.db
      .select({ modMuted: serverMembers.modMuted })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
    return row?.modMuted ?? false;
  }

  // REQ-VC-04 AC5: kept whether they are in a room or not. False = it was so already.
  async setModMuted(
    serverId: bigint,
    userId: bigint,
    muted: boolean,
  ): Promise<boolean> {
    const rows = await this.db
      .update(serverMembers)
      .set({ modMuted: muted })
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
          eq(serverMembers.modMuted, !muted),
        ),
      )
      .returning({ userId: serverMembers.userId });
    return rows.length > 0;
  }

  // SRS 8.5.2: the server's roles and both people, for canActOnMember. null = no server, or
  // either one is not a member.
  async hierarchy(
    serverId: bigint,
    actorId: bigint,
    targetId: bigint,
  ): Promise<{
    server: PermissionServer;
    actor: PermissionMember | null;
    target: PermissionMember | null;
  } | null> {
    const [server] = await this.db
      .select({ ownerId: servers.ownerId })
      .from(servers)
      .where(eq(servers.id, serverId));
    if (!server) return null;
    const people = [actorId, targetId];
    const [roleRows, members, given] = await Promise.all([
      this.db
        .select({
          id: roles.id,
          permissions: roles.permissions,
          position: roles.position,
        })
        .from(roles)
        .where(eq(roles.serverId, serverId)),
      this.db
        .select({ userId: serverMembers.userId })
        .from(serverMembers)
        .where(
          and(
            eq(serverMembers.serverId, serverId),
            inArray(serverMembers.userId, people),
          ),
        ),
      this.db
        .select({
          userId: serverMemberRoles.userId,
          roleId: serverMemberRoles.roleId,
        })
        .from(serverMemberRoles)
        .where(
          and(
            eq(serverMemberRoles.serverId, serverId),
            inArray(serverMemberRoles.userId, people),
          ),
        ),
    ]);
    const member = (userId: bigint): PermissionMember | null =>
      members.some((m) => m.userId === userId)
        ? {
            userId: userId.toString(),
            roleIds: given
              .filter((g) => g.userId === userId)
              .map((g) => g.roleId.toString()),
          }
        : null;
    return {
      server: {
        id: serverId.toString(),
        ownerId: server.ownerId.toString(),
        roles: roleRows.map((r) => ({ ...r, id: r.id.toString() })),
      },
      actor: member(actorId),
      target: member(targetId),
    };
  }

  // "serverId:userId" of everyone mod-muted among these users.
  async modMutedAmong(userIds: readonly bigint[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();
    const rows = await this.db
      .select({
        serverId: serverMembers.serverId,
        userId: serverMembers.userId,
      })
      .from(serverMembers)
      .where(
        and(
          inArray(serverMembers.userId, [...userIds]),
          eq(serverMembers.modMuted, true),
        ),
      );
    return new Set(rows.map((r) => `${r.serverId}:${r.userId}`));
  }
}
