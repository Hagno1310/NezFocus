import { Inject, Injectable } from '@nestjs/common';
import type { PermissionOverwrite } from '@nezfocus/shared';
import { and, asc, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import { toOverwriteRow } from './servers.dto.js';
import {
  channelPermissionOverwrites,
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
  type ChannelRow,
  type OverwriteRow,
} from './servers.schema.js';

// A channel with its own overwrites (REQ-ROLE-03), what ChannelResponse is made from.
export type ChannelWithOverwrites = ChannelRow & { overwrites: OverwriteRow[] };

export type ChannelMove = {
  id: bigint;
  position: number;
  parentId: bigint | null;
  permissionsSynced: boolean;
  overwrites?: PermissionOverwrite[]; // replaces the channel's own (v1.8: left its category)
};

// The server's roles and some of its members, for the 8.5.2 hierarchy of an overwrite write.
export type People = {
  ownerId: bigint;
  roles: { id: bigint; permissions: bigint; position: number }[];
  roleIdsOf: Map<bigint, bigint[]>; // only the users who are members
};

const live = (serverId: bigint) =>
  and(eq(channels.serverId, serverId), isNull(channels.deletedAt));

export async function withOverwrites(
  db: Db | Tx,
  rows: ChannelRow[],
): Promise<ChannelWithOverwrites[]> {
  const found = rows.length
    ? await db
        .select()
        .from(channelPermissionOverwrites)
        .where(
          inArray(
            channelPermissionOverwrites.channelId,
            rows.map((r) => r.id),
          ),
        )
    : [];
  return rows.map((r) => ({
    ...r,
    overwrites: found.filter((o) => o.channelId === r.id),
  }));
}

const liveRows = async (db: Db | Tx, serverId: bigint) =>
  withOverwrites(
    db,
    await db
      .select()
      .from(channels)
      .where(live(serverId))
      .orderBy(asc(channels.position), asc(channels.id)),
  );

// The writes of one server's channels while its row is locked (`ChannelsRepository.locked`):
// `rows` is what the checks see, and nothing else can change until the transaction ends.
export class LockedChannels {
  constructor(
    private readonly tx: Tx,
    readonly rows: ChannelWithOverwrites[],
  ) {}

  // The new channel goes last in its group. The caller checked the limit on `rows`.
  async create(
    row: Omit<typeof channels.$inferInsert, 'position'>,
    overwrites: readonly PermissionOverwrite[] = [],
  ): Promise<ChannelWithOverwrites> {
    const group = row.parentId
      ? eq(channels.parentId, row.parentId)
      : and(
          isNull(channels.parentId),
          row.type === 0 ? eq(channels.type, 0) : sql`${channels.type} <> 0`,
        );
    const [last] = await this.tx
      .select({ p: max(channels.position) })
      .from(channels)
      .where(and(live(row.serverId!), group));
    const [created] = await this.tx
      .insert(channels)
      .values({ ...row, position: (last?.p ?? -1) + 1 })
      .returning();
    await this.replaceOverwrites(created!.id, overwrites);
    return (await this.reload(created!.id))!;
  }

  async update(
    channelId: bigint,
    set: { name?: string; permissionsSynced?: boolean },
  ): Promise<void> {
    await this.tx.update(channels).set(set).where(eq(channels.id, channelId));
  }

  async move(moves: ChannelMove[]): Promise<void> {
    for (const { id, overwrites, ...set } of moves) {
      await this.tx.update(channels).set(set).where(eq(channels.id, id));
      if (overwrites) await this.replaceOverwrites(id, overwrites);
    }
  }

  async replaceOverwrites(
    channelId: bigint,
    overwrites: readonly PermissionOverwrite[],
  ): Promise<void> {
    await this.tx
      .delete(channelPermissionOverwrites)
      .where(eq(channelPermissionOverwrites.channelId, channelId));
    if (overwrites.length)
      await this.tx
        .insert(channelPermissionOverwrites)
        .values(overwrites.map((o) => toOverwriteRow(channelId, o)));
  }

  async putOverwrite(channelId: bigint, o: PermissionOverwrite) {
    const row = toOverwriteRow(channelId, o);
    await this.tx
      .insert(channelPermissionOverwrites)
      .values(row)
      .onConflictDoUpdate({
        target: [
          channelPermissionOverwrites.channelId,
          channelPermissionOverwrites.targetId,
          channelPermissionOverwrites.targetType,
        ],
        set: { allow: row.allow, deny: row.deny },
      });
  }

  // The target id names a role or a user, never both (one snowflake space).
  async deleteOverwrite(channelId: bigint, targetId: bigint): Promise<void> {
    await this.tx
      .delete(channelPermissionOverwrites)
      .where(
        and(
          eq(channelPermissionOverwrites.channelId, channelId),
          eq(channelPermissionOverwrites.targetId, targetId),
        ),
      );
  }

  async reload(channelId: bigint): Promise<ChannelWithOverwrites | undefined> {
    const [row] = await withOverwrites(
      this.tx,
      await this.tx.select().from(channels).where(eq(channels.id, channelId)),
    );
    return row;
  }

  // Read under the same server row lock as every role write (`RolesRepository.locked`).
  async people(serverId: bigint, userIds: bigint[]): Promise<People> {
    // One after the other: a transaction is one connection.
    const [server] = await this.tx
      .select({ ownerId: servers.ownerId })
      .from(servers)
      .where(eq(servers.id, serverId));
    const roleRows = await this.tx
      .select({
        id: roles.id,
        permissions: roles.permissions,
        position: roles.position,
      })
      .from(roles)
      .where(eq(roles.serverId, serverId));
    const members = await this.tx
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          inArray(serverMembers.userId, userIds),
        ),
      );
    const memberRoles = await this.tx
      .select({
        userId: serverMemberRoles.userId,
        roleId: serverMemberRoles.roleId,
      })
      .from(serverMemberRoles)
      .where(
        and(
          eq(serverMemberRoles.serverId, serverId),
          inArray(serverMemberRoles.userId, userIds),
        ),
      );
    return {
      ownerId: server!.ownerId,
      roles: roleRows,
      roleIdsOf: new Map(
        members.map(({ userId }) => [
          userId,
          memberRoles.filter((r) => r.userId === userId).map((r) => r.roleId),
        ]),
      ),
    };
  }

  // Soft-delete, children up to the top group (category), and the server stops welcoming
  // in it (REQ-SRV-01 v1.9). true when the kênh tin chào mừng was cleared.
  async softDelete(
    channel: ChannelRow,
    children: ChannelMove[],
    now: Date,
  ): Promise<boolean> {
    await this.tx
      .update(channels)
      .set({ deletedAt: now })
      .where(eq(channels.id, channel.id));
    await this.move(children);
    const cleared = await this.tx
      .update(servers)
      .set({ systemChannelId: null })
      .where(
        and(
          eq(servers.id, channel.serverId!),
          eq(servers.systemChannelId, channel.id),
        ),
      )
      .returning({ id: servers.id });
    return cleared.length > 0;
  }
}

// REQ-SRV-02. Reads see live channels only (deleted_at IS NULL).
@Injectable()
export class ChannelsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  listForServer(serverId: bigint): Promise<ChannelWithOverwrites[]> {
    return liveRows(this.db, serverId);
  }

  async byIds(channelIds: bigint[]): Promise<ChannelWithOverwrites[]> {
    if (!channelIds.length) return [];
    return withOverwrites(
      this.db,
      await this.db
        .select()
        .from(channels)
        .where(
          and(inArray(channels.id, channelIds), isNull(channels.deletedAt)),
        ),
    );
  }

  // Every channel write of a server runs here: the server row is locked first, so two
  // requests at once (two creates at the 500 limit, two channels renamed to one name) run
  // one after the other and the second one checks against what the first one wrote.
  // Throwing inside `work` rolls the whole transaction back.
  locked<T>(
    serverId: bigint,
    work: (channels: LockedChannels) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .for('update');
      return work(new LockedChannels(tx, await liveRows(tx, serverId)));
    });
  }
}
