import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DB, type Db } from '../../db/db.module.js';
import { ChannelTypeCode, channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import { channelRecipients } from './dm.schema.js';

@Injectable()
export class DmRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // The two people of a live DM; null when channelId is not one (a server channel, unknown).
  async recipients(channelId: bigint): Promise<bigint[] | null> {
    const rows = await this.db
      .select({ userId: channelRecipients.userId })
      .from(channels)
      .leftJoin(channelRecipients, eq(channelRecipients.channelId, channels.id))
      .where(
        and(
          eq(channels.id, channelId),
          eq(channels.type, ChannelTypeCode.dm),
          isNull(channels.deletedAt),
        ),
      );
    if (!rows.length) return null;
    return rows.flatMap((r) => (r.userId === null ? [] : [r.userId]));
  }

  // READY: my DMs not closed on my side, with the other person.
  async openFor(userId: bigint) {
    const other = alias(channelRecipients, 'other');
    return this.db
      .select({
        channelId: channels.id,
        lastMessageId: channels.lastMessageId,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarKey: users.avatarKey,
          accountStatus: users.accountStatus,
        },
      })
      .from(channelRecipients)
      .innerJoin(channels, eq(channels.id, channelRecipients.channelId))
      .innerJoin(
        other,
        and(
          eq(other.channelId, channels.id),
          ne(other.userId, channelRecipients.userId),
        ),
      )
      .innerJoin(users, eq(users.id, other.userId))
      .where(
        and(
          eq(channelRecipients.userId, userId),
          eq(channelRecipients.closed, false),
          eq(channels.type, ChannelTypeCode.dm),
          isNull(channels.deletedAt),
        ),
      )
      .orderBy(desc(sql`coalesce(${channels.lastMessageId}, ${channels.id})`));
  }

  async setClosed(channelId: bigint, userId: bigint, closed: boolean) {
    await this.db
      .update(channelRecipients)
      .set({ closed })
      .where(
        and(
          eq(channelRecipients.channelId, channelId),
          eq(channelRecipients.userId, userId),
        ),
      );
  }
}
