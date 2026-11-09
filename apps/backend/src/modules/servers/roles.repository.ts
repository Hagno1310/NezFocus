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
export type RoleWithCount = RoleRow & { memberCount: number };

// The writes of one server's roles while its row is locked (`RolesRepository.locked`).
export class LockedRoles {
  constructor(
    private readonly tx: Tx,
    readonly rows: RoleRow[],
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
  async remove(role: RoleRow) {
    await this.tx
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
      );
    await this.tx.delete(roles).where(eq(roles.id, role.id));
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
  locked<T>(serverId: bigint, work: (r: LockedRoles) => Promise<T>) {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .for('update');
      const rows = await tx
        .select()
        .from(roles)
        .where(eq(roles.serverId, serverId));
      return work(new LockedRoles(tx, rows));
    });
  }
}
