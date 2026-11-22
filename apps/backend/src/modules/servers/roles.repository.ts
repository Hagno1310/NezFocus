import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import {
  OverwriteTargetCode,
  channelPermissionOverwrites,
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
  type RoleRow,
} from './servers.schema.js';

export type RolePlace = { id: bigint; position: number };
export type Caller = { ownerId: bigint; roleIds: bigint[] };
export type RoleWithCount = RoleRow & { memberCount: number };

// The writes of one server's roles while its row is locked (`RolesRepository.locked`).
export class LockedRoles {
  constructor(
    private readonly tx: Tx,
    private readonly serverId: bigint,
    readonly rows: RoleRow[],
    readonly caller: Caller, // read under the lock, like the rows
  ) {}

  async move(places: RolePlace[]) {
    for (const p of places)
      await this.tx
        .update(roles)
        .set({ position: p.position })
        .where(eq(roles.id, p.id));
  }

  async create(row: typeof roles.$inferInsert): Promise<RoleRow> {
    const [created] = await this.tx.insert(roles).values(row).returning();
    return created!;
  }

  async update(
    id: bigint,
    set: Partial<Pick<RoleRow, 'name' | 'permissions' | 'isMentionable'>>,
  ): Promise<RoleRow> {
    const [updated] = await this.tx
      .update(roles)
      .set(set)
      .where(eq(roles.id, id))
      .returning();
    return updated!;
  }

  // Members lose it by FK cascade; its overwrites have no FK (target is a role or a user).
  // Returns the channels whose overwrites changed.
  async remove(role: RoleRow): Promise<bigint[]> {
    const dropped = await this.tx
      .delete(channelPermissionOverwrites)
      .where(
        and(
          eq(channelPermissionOverwrites.targetType, OverwriteTargetCode.role),
          eq(channelPermissionOverwrites.targetId, role.id),
          inArray(
            channelPermissionOverwrites.channelId,
            this.tx
              .select({ id: channels.id })
              .from(channels)
              .where(eq(channels.serverId, role.serverId)),
          ),
        ),
      )
      .returning({ channelId: channelPermissionOverwrites.channelId });
    await this.tx.delete(roles).where(eq(roles.id, role.id));
    return dropped.map((d) => d.channelId);
  }

  // REQ-ROLE-04: a member's roles without @everyone; null when they are not in the server.
  async memberRoleIds(userId: bigint): Promise<bigint[] | null> {
    const serverId = this.serverId;
    const [member] = await this.tx
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
    if (!member) return null;
    const rows = await this.tx
      .select({ roleId: serverMemberRoles.roleId })
      .from(serverMemberRoles)
      .where(
        and(
          eq(serverMemberRoles.serverId, serverId),
          eq(serverMemberRoles.userId, userId),
        ),
      );
    return rows.map((r) => r.roleId);
  }

  // false: nothing changed (already given / already gone).
  async giveRole(userId: bigint, roleId: bigint): Promise<boolean> {
    const added = await this.tx
      .insert(serverMemberRoles)
      .values({ serverId: this.serverId, userId, roleId })
      .onConflictDoNothing()
      .returning({ roleId: serverMemberRoles.roleId });
    return added.length > 0;
  }

  async takeRole(userId: bigint, roleId: bigint): Promise<boolean> {
    const removed = await this.tx
      .delete(serverMemberRoles)
      .where(
        and(
          eq(serverMemberRoles.serverId, this.serverId),
          eq(serverMemberRoles.userId, userId),
          eq(serverMemberRoles.roleId, roleId),
        ),
      )
      .returning({ roleId: serverMemberRoles.roleId });
    return removed.length > 0;
  }

  async byIds(ids: bigint[]): Promise<RoleRow[]> {
    if (!ids.length) return [];
    return this.tx.select().from(roles).where(inArray(roles.id, ids));
  }
}

@Injectable()
export class RolesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // S-SET-02 `list`: highest first, @everyone (everyone in the server) last.
  async list(serverId: bigint): Promise<RoleWithCount[]> {
    const [rows, [members]] = await Promise.all([
      this.db
        .select({ role: roles, n: count(serverMemberRoles.userId) })
        .from(roles)
        .leftJoin(serverMemberRoles, eq(serverMemberRoles.roleId, roles.id))
        .where(eq(roles.serverId, serverId))
        .groupBy(roles.id)
        .orderBy(sql`${roles.position} DESC`, roles.id),
      this.db
        .select({ n: count() })
        .from(serverMembers)
        .where(eq(serverMembers.serverId, serverId)),
    ]);
    return rows.map(({ role, n }) => ({
      ...role,
      memberCount: role.id === serverId ? members!.n : n,
    }));
  }

  // Every role write of a server runs here, one after the other (two creates at the 250
  // limit, two renames to one name). Throwing inside `work` rolls everything back.
  locked<T>(
    serverId: bigint,
    userId: bigint,
    work: (r: LockedRoles) => Promise<T>,
  ) {
    return this.db.transaction(async (tx) => {
      const [server] = await tx
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(eq(servers.id, serverId))
        .for('update');
      const [rows, mine] = await Promise.all([
        tx.select().from(roles).where(eq(roles.serverId, serverId)),
        tx
          .select({ roleId: serverMemberRoles.roleId })
          .from(serverMemberRoles)
          .where(
            and(
              eq(serverMemberRoles.serverId, serverId),
              eq(serverMemberRoles.userId, userId),
            ),
          ),
      ]);
      const caller = {
        ownerId: server!.ownerId,
        roleIds: mine.map((r) => r.roleId),
      };
      return work(new LockedRoles(tx, serverId, rows, caller));
    });
  }
}
