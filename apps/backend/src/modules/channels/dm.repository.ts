import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DB, type Db } from '../../db/db.module.js';
import { attachments } from '../attachments/attachments.schema.js';
import { pairKey } from '../friends/friends.repository.js';
import { FriendshipStatus, friendships } from '../friends/friends.schema.js';
import { messages } from '../messaging/messages.schema.js';
import {
  ChannelTypeCode,
  channels,
  serverMembers,
  servers,
} from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import { channelRecipients, dmPairs } from './dm.schema.js';

const recipientColumns = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarKey: users.avatarKey,
  accountStatus: users.accountStatus,
};

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

  // My DMs as I see them: the other person, newest activity first. One channel or all open.
  // The last message's images too: S-DM-01 reads "Đã gửi một ảnh" (REQ-MSG-04).
  async seenBy(userId: bigint, only?: bigint) {
    const rows = await this.dmRows(userId, only);
    const lastIds = rows.flatMap((r) => (r.last ? [r.last.id] : []));
    const files = lastIds.length
      ? await this.db
          .select()
          .from(attachments)
          .where(inArray(attachments.messageId, lastIds))
          .orderBy(asc(attachments.id))
      : [];
    return rows.map((r) => ({
      ...r,
      lastFiles: files.filter((f) => f.messageId === r.last?.id),
    }));
  }

  private dmRows(userId: bigint, only?: bigint) {
    const other = alias(channelRecipients, 'other');
    const lastAuthor = alias(users, 'last_author');
    return this.db
      .select({
        channelId: channels.id,
        lastMessageId: channels.lastMessageId,
        user: recipientColumns,
        last: messages,
        lastAuthor: {
          id: lastAuthor.id,
          username: lastAuthor.username,
          displayName: lastAuthor.displayName,
          avatarKey: lastAuthor.avatarKey,
        },
      })
      .from(channelRecipients)
      .innerJoin(channels, eq(channels.id, channelRecipients.channelId))
      .leftJoin(messages, eq(messages.id, channels.lastMessageId))
      .leftJoin(lastAuthor, eq(lastAuthor.id, messages.authorId))
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
          only === undefined
            ? eq(channelRecipients.closed, false)
            : eq(channels.id, only),
          eq(channels.type, ChannelTypeCode.dm),
          isNull(channels.deletedAt),
        ),
      )
      .orderBy(desc(sql`coalesce(${channels.lastMessageId}, ${channels.id})`));
  }

  async user(id: bigint) {
    const [row] = await this.db
      .select(recipientColumns)
      .from(users)
      .where(eq(users.id, id));
    return row;
  }

  async pairChannel(a: bigint, b: bigint): Promise<bigint | undefined> {
    const { low, high } = pairKey(a, b);
    const [row] = await this.db
      .select({ channelId: dmPairs.channelId })
      .from(dmPairs)
      .where(and(eq(dmPairs.userIdLow, low), eq(dmPairs.userIdHigh, high)));
    return row?.channelId;
  }

  // REQ-DM-03 AC2: the dm_pairs primary key makes the loser of a race throw a unique violation.
  async createPair(channelId: bigint, a: bigint, b: bigint) {
    const { low, high } = pairKey(a, b);
    await this.db.transaction(async (tx) => {
      await tx
        .insert(channels)
        .values({ id: channelId, type: ChannelTypeCode.dm });
      await tx.insert(channelRecipients).values([
        { channelId, userId: a },
        { channelId, userId: b },
      ]);
      await tx
        .insert(dmPairs)
        .values({ userIdLow: low, userIdHigh: high, channelId });
    });
  }

  // True when it was closed and is open now.
  async reopen(channelId: bigint, userId: bigint) {
    const rows = await this.db
      .update(channelRecipients)
      .set({ closed: false })
      .where(
        and(
          eq(channelRecipients.channelId, channelId),
          eq(channelRecipients.userId, userId),
          eq(channelRecipients.closed, true),
        ),
      )
      .returning({ userId: channelRecipients.userId });
    return rows.length > 0;
  }

  // REQ-DM-03: a new message reopens the DM for whoever had closed it.
  async reopenAll(channelId: bigint): Promise<bigint[]> {
    const rows = await this.db
      .update(channelRecipients)
      .set({ closed: false })
      .where(
        and(
          eq(channelRecipients.channelId, channelId),
          eq(channelRecipients.closed, true),
        ),
      )
      .returning({ userId: channelRecipients.userId });
    return rows.map((r) => r.userId);
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

  async areFriends(a: bigint, b: bigint) {
    const { low, high } = pairKey(a, b);
    const [row] = await this.db
      .select({ status: friendships.status })
      .from(friendships)
      .where(
        and(
          eq(friendships.userIdLow, low),
          eq(friendships.userIdHigh, high),
          eq(friendships.status, FriendshipStatus.accepted),
        ),
      );
    return !!row;
  }

  // AUTH-06 v1.9: in the viewer's rail order (oldest joined first, REQ-SRV-01).
  async sharedServers(viewer: bigint, other: bigint) {
    const theirs = this.db
      .select({ id: serverMembers.serverId })
      .from(serverMembers)
      .where(eq(serverMembers.userId, other));
    return this.db
      .select({ id: servers.id, name: servers.name, iconKey: servers.iconKey })
      .from(serverMembers)
      .innerJoin(servers, eq(servers.id, serverMembers.serverId))
      .where(
        and(
          eq(serverMembers.userId, viewer),
          inArray(serverMembers.serverId, theirs),
        ),
      )
      .orderBy(asc(serverMembers.joinedAt), asc(servers.id));
  }
}
