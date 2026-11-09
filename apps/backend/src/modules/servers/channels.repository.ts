import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, max, sql } from 'drizzle-orm';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import { channels, servers, type ChannelRow } from './servers.schema.js';

export type ChannelMove = {
  id: bigint;
  position: number;
  parentId: bigint | null;
  permissionsSynced: boolean;
};

const live = (serverId: bigint) =>
  and(eq(channels.serverId, serverId), isNull(channels.deletedAt));

const liveRows = (db: Db | Tx, serverId: bigint) =>
  db
    .select()
    .from(channels)
    .where(live(serverId))
    .orderBy(asc(channels.position), asc(channels.id));

// The writes of one server's channels while its row is locked (`ChannelsRepository.locked`):
// `rows` is what the checks see, and nothing else can change until the transaction ends.
export class LockedChannels {
  constructor(
    private readonly tx: Tx,
    readonly rows: ChannelRow[],
  ) {}

  // The new channel goes last in its group. The caller checked the limit on `rows`.
  async create(
    row: Omit<typeof channels.$inferInsert, 'position'>,
  ): Promise<ChannelRow> {
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
    return created!;
  }

  async rename(channelId: bigint, name: string): Promise<ChannelRow> {
    const [row] = await this.tx
      .update(channels)
      .set({ name })
      .where(eq(channels.id, channelId))
      .returning();
    return row!;
  }

  async move(moves: ChannelMove[]): Promise<void> {
    for (const { id, ...set } of moves)
      await this.tx.update(channels).set(set).where(eq(channels.id, id));
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

  listForServer(serverId: bigint): Promise<ChannelRow[]> {
    return liveRows(this.db, serverId);
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
