import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull, max, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { channels, servers, type ChannelRow } from './servers.schema.js';

export type ChannelMove = {
  id: bigint;
  position: number;
  parentId: bigint | null;
  permissionsSynced: boolean;
};

const live = (serverId: bigint) =>
  and(eq(channels.serverId, serverId), isNull(channels.deletedAt));

// REQ-SRV-02. Reads see live channels only (deleted_at IS NULL).
@Injectable()
export class ChannelsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  listForServer(serverId: bigint): Promise<ChannelRow[]> {
    return this.db
      .select()
      .from(channels)
      .where(live(serverId))
      .orderBy(asc(channels.position), asc(channels.id));
  }

  // undefined: the server already has `limit` channels. Locking the server row makes two
  // creates at limit − 1 run one after the other. The new channel goes last in its group.
  async create(
    row: Omit<typeof channels.$inferInsert, 'position'>,
    limit: number,
  ): Promise<ChannelRow | undefined> {
    const serverId = row.serverId!;
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .for('update');
      const [total] = await tx
        .select({ n: count() })
        .from(channels)
        .where(live(serverId));
      if (total!.n >= limit) return undefined;

      const group = row.parentId
        ? eq(channels.parentId, row.parentId)
        : and(
            isNull(channels.parentId),
            row.type === 0 ? eq(channels.type, 0) : sql`${channels.type} <> 0`,
          );
      const [last] = await tx
        .select({ p: max(channels.position) })
        .from(channels)
        .where(and(live(serverId), group));
      const [created] = await tx
        .insert(channels)
        .values({ ...row, position: (last?.p ?? -1) + 1 })
        .returning();
      return created;
    });
  }

  async rename(channelId: bigint, name: string): Promise<ChannelRow> {
    const [row] = await this.db
      .update(channels)
      .set({ name })
      .where(eq(channels.id, channelId))
      .returning();
    return row!;
  }

  async move(moves: ChannelMove[]): Promise<void> {
    if (!moves.length) return;
    await this.db.transaction(async (tx) => {
      for (const { id, ...set } of moves)
        await tx.update(channels).set(set).where(eq(channels.id, id));
    });
  }

  // One transaction: soft-delete, children up to the top group (category), and the server
  // stops welcoming in it (REQ-SRV-01 v1.9). true when the kênh tin chào mừng was cleared.
  async softDelete(
    channel: ChannelRow,
    children: ChannelMove[],
    now: Date,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(channels)
        .set({ deletedAt: now })
        .where(eq(channels.id, channel.id));
      for (const { id, ...set } of children)
        await tx.update(channels).set(set).where(eq(channels.id, id));
      const cleared = await tx
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
    });
  }
}
