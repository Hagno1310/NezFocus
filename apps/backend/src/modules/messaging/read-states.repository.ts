import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import {
  ChannelTypeCode,
  channels,
  serverMemberRoles,
  serverMembers,
} from '../servers/servers.schema.js';
import { messages, readStates } from './messages.schema.js';

export type ChannelReadState = {
  channelId: bigint;
  serverId: bigint | null;
  lastMessageId: bigint | null;
  lastReadMessageId: bigint; // 0 = nothing read
  mentionCount: number;
};

// REQ-NOTIF-01 read state (SRS 8.2 read_states).
@Injectable()
export class ReadStatesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // NOTIF-01: last read never moves back; mention_count = the messages that concern me after it.
  async ack(userId: bigint, channelId: bigint, messageId: bigint) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(readStates)
        .values({ userId, channelId, lastReadMessageId: messageId })
        .onConflictDoUpdate({
          target: [readStates.userId, readStates.channelId],
          set: {
            lastReadMessageId: sql`GREATEST(${readStates.lastReadMessageId}, ${messageId})`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ lastRead: readStates.lastReadMessageId });
      const lastRead = row!.lastRead;
      const [{ n }] = (await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            eq(messages.channelId, channelId),
            sql`${messages.id} > ${lastRead}`,
            sql`${messages.authorId} <> ${userId}`,
            eq(messages.type, 0),
            sql`${channels.serverId} IS NOT NULL`,
            // REQ-MSG-03 (CR-12): mentioned me, everyone, or a role I have.
            // ponytail: a @here counts here even if I was offline then (chốt 22/11/2026).
            sql`(${userId} = ANY(${messages.mentionUserIds})
              OR ${messages.mentionEveryone}
              OR ${messages.mentionRoleIds} && ARRAY(
                SELECT ${serverMemberRoles.roleId} FROM ${serverMemberRoles}
                WHERE ${serverMemberRoles.serverId} = ${channels.serverId}
                  AND ${serverMemberRoles.userId} = ${userId}))`,
          ),
        )) as [{ n: number }];
      await tx
        .update(readStates)
        .set({ mentionCount: n })
        .where(
          and(
            eq(readStates.userId, userId),
            eq(readStates.channelId, channelId),
          ),
        );
      return { lastRead, mentionCount: n };
    });
  }

  // CR-12: +1 for each person the new message concerns, unless they already read past it.
  async addMention(channelId: bigint, messageId: bigint, userIds: bigint[]) {
    if (!userIds.length) return;
    await this.db
      .insert(readStates)
      .values(userIds.map((userId) => ({ userId, channelId, mentionCount: 1 })))
      .onConflictDoUpdate({
        target: [readStates.userId, readStates.channelId],
        set: {
          mentionCount: sql`${readStates.mentionCount} + 1`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`${readStates.lastReadMessageId} < ${messageId}`,
      });
  }

  // Chốt 22/11/2026: what was in the server before I joined counts as read.
  async markServerRead(userId: bigint, serverId: bigint) {
    await this.db
      .insert(readStates)
      .select(
        this.db
          .select({
            userId: sql`${userId}`.as('user_id'),
            channelId: channels.id,
            lastReadMessageId: sql`COALESCE(${channels.lastMessageId}, 0)`.as(
              'last_read_message_id',
            ),
            mentionCount: sql`0`.as('mention_count'),
            updatedAt: sql`now()`.as('updated_at'),
          })
          .from(channels)
          .where(
            and(eq(channels.serverId, serverId), isNull(channels.deletedAt)),
          ),
      )
      .onConflictDoNothing();
  }

  // READY: every live text channel of my servers, read state or not; the caller filters by view.
  // ponytail: text channels only; voice channel chat adds its type with P3-B7 (#160), DMs with
  // P2-B3.2 (#115).
  async forUser(userId: bigint): Promise<ChannelReadState[]> {
    const rows = await this.db
      .select({
        channelId: channels.id,
        serverId: channels.serverId,
        lastMessageId: channels.lastMessageId,
        lastReadMessageId: readStates.lastReadMessageId,
        mentionCount: readStates.mentionCount,
      })
      .from(channels)
      .innerJoin(
        serverMembers,
        and(
          eq(serverMembers.serverId, channels.serverId),
          eq(serverMembers.userId, userId),
        ),
      )
      .leftJoin(
        readStates,
        and(
          eq(readStates.channelId, channels.id),
          eq(readStates.userId, userId),
        ),
      )
      .where(
        and(
          eq(channels.type, ChannelTypeCode.text),
          isNull(channels.deletedAt),
        ),
      );
    return rows.map((r) => ({
      ...r,
      lastReadMessageId: r.lastReadMessageId ?? 0n,
      mentionCount: r.mentionCount ?? 0,
    }));
  }

  async messageInChannel(channelId: bigint, messageId: bigint) {
    const [row] = await this.db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(eq(messages.id, messageId), eq(messages.channelId, channelId)),
      );
    return !!row;
  }
}
