import { Inject, Injectable } from '@nestjs/common';
import type { MessageHistoryQuery } from '@nezfocus/shared';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import {
  attachments,
  type AttachmentRow,
} from '../attachments/attachments.schema.js';
import {
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
} from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import type { AuthorRow } from './messages.dto.js';
import {
  messageReactions,
  messages,
  readStates,
  type MessageRow,
} from './messages.schema.js';

export type MessageWithAuthor = { message: MessageRow; author: AuthorRow };

// REQ-MSG-04 AC5: an attachment id that is not a completed image of the author for this
// channel, or was taken by another message meanwhile. Rolls the message back.
export class AttachmentsUnavailable extends Error {}
export type NewMessage = typeof messages.$inferInsert;

const author = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarKey: users.avatarKey,
};

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async author(userId: bigint): Promise<AuthorRow | undefined> {
    const [row] = await this.db
      .select(author)
      .from(users)
      .where(eq(users.id, userId));
    return row;
  }

  private select() {
    return this.db
      .select({ message: messages, author })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.authorId));
  }

  async byNonce(
    authorId: bigint,
    nonce: string,
  ): Promise<MessageWithAuthor | undefined> {
    const [row] = await this.select().where(
      and(eq(messages.authorId, authorId), eq(messages.nonce, nonce)),
    );
    return row;
  }

  // Throws a unique violation on uq_messages_author_nonce when the same nonce raced in.
  // `concerned` get +1 mention_count in the same transaction, so an ack recounting at the same
  // time (ReadStatesRepository.ack) never counts the message twice (CR-12).
  async create(
    row: NewMessage,
    concerned: readonly bigint[] = [],
    attachmentIds: readonly bigint[] = [],
  ): Promise<MessageWithAuthor> {
    await this.db.transaction(async (tx) => {
      await tx.insert(messages).values(row);
      if (attachmentIds.length) {
        const taken = await tx
          .update(attachments)
          .set({ messageId: row.id })
          .where(
            and(
              inArray(attachments.id, [...attachmentIds]),
              eq(attachments.uploaderId, row.authorId),
              eq(attachments.channelId, row.channelId),
              eq(attachments.purpose, 'message'),
              eq(attachments.scanStatus, 'clean'),
              isNull(attachments.messageId),
            ),
          )
          .returning({ id: attachments.id });
        if (taken.length !== attachmentIds.length)
          throw new AttachmentsUnavailable();
      }
      await tx
        .update(channels)
        .set({ lastMessageId: row.id })
        .where(eq(channels.id, row.channelId));
      if (concerned.length)
        await tx
          .insert(readStates)
          .values(
            concerned.map((userId) => ({
              userId,
              channelId: row.channelId,
              mentionCount: 1,
            })),
          )
          .onConflictDoUpdate({
            target: [readStates.userId, readStates.channelId],
            set: {
              mentionCount: sql`${readStates.mentionCount} + 1`,
              updatedAt: sql`now()`,
            },
          });
    });
    const [saved] = await this.select().where(eq(messages.id, row.id));
    return saved!;
  }

  // REQ-MSG-04: the images of these messages, in upload order.
  attachmentsOf(messageIds: readonly bigint[]): Promise<AttachmentRow[]> {
    if (!messageIds.length) return Promise.resolve([]);
    return this.db
      .select()
      .from(attachments)
      .where(inArray(attachments.messageId, [...messageIds]))
      .orderBy(asc(attachments.id));
  }

  // REQ-SEARCH-02: by id, so a message sent meanwhile never shifts a page. Oldest first.
  async history(
    channelId: bigint,
    { before, after, around, limit }: MessageHistoryQuery,
  ): Promise<MessageWithAuthor[]> {
    // REQ-MSG-05 AC3: a deleted message is gone for everyone.
    const inChannel = (cond?: SQL) =>
      and(eq(messages.channelId, channelId), isNull(messages.deletedAt), cond);
    const newest = (cond: SQL | undefined, n: number) =>
      this.select()
        .where(inChannel(cond))
        .orderBy(desc(messages.id))
        .limit(n)
        .then((rows) => rows.reverse());
    const oldest = (cond: SQL, n: number) =>
      this.select().where(inChannel(cond)).orderBy(asc(messages.id)).limit(n);

    if (before) return newest(lt(messages.id, BigInt(before)), limit);
    if (after) return oldest(gt(messages.id, BigInt(after)), limit);
    if (around) {
      const id = BigInt(around);
      const older = await newest(lt(messages.id, id), Math.floor(limit / 2));
      return [
        ...older,
        ...(await oldest(gte(messages.id, id), limit - older.length)),
      ];
    }
    return newest(undefined, limit);
  }

  // Deleted ones too: a reply may point at one (REQ-MSG-05 AC6).
  async one(
    channelId: bigint,
    messageId: bigint,
  ): Promise<MessageWithAuthor | undefined> {
    const [row] = await this.select().where(
      and(eq(messages.channelId, channelId), eq(messages.id, messageId)),
    );
    return row;
  }

  // The reply line of each message; deleted originals are left out (AC6).
  async referenced(ids: bigint[]): Promise<Map<bigint, MessageWithAuthor>> {
    if (!ids.length) return new Map();
    const rows = await this.select().where(
      and(inArray(messages.id, ids), isNull(messages.deletedAt)),
    );
    return new Map(rows.map((r) => [r.message.id, r]));
  }

  async edit(
    id: bigint,
    set: Pick<
      MessageRow,
      'content' | 'mentionUserIds' | 'mentionRoleIds' | 'mentionEveryone'
    > & { editedAt: Date },
  ): Promise<MessageWithAuthor> {
    await this.db.update(messages).set(set).where(eq(messages.id, id));
    const [row] = await this.select().where(eq(messages.id, id));
    return row!;
  }

  // false = someone deleted it first. The channel's last_message_id steps back past it, so a
  // deleted last message leaves nothing unread (NOTIF-01).
  async softDelete(channelId: bigint, id: bigint, at: Date) {
    return this.db.transaction(async (tx) => {
      const done = await tx
        .update(messages)
        .set({ deletedAt: at })
        .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
        .returning({ id: messages.id });
      if (!done.length) return false;
      const [last] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(eq(messages.channelId, channelId), isNull(messages.deletedAt)),
        )
        .orderBy(desc(messages.id))
        .limit(1);
      await tx
        .update(channels)
        .set({ lastMessageId: last?.id ?? null })
        .where(and(eq(channels.id, channelId), eq(channels.lastMessageId, id)));
      return true;
    });
  }

  // Per message, emoji in the order first put, with whether `viewerId` put it.
  async reactions(messageIds: bigint[], viewerId: bigint) {
    if (!messageIds.length) return [];
    return this.db
      .select({
        messageId: messageReactions.messageId,
        emoji: messageReactions.emoji,
        count: sql<number>`count(*)::int`,
        me: sql<boolean>`bool_or(${messageReactions.userId} = ${viewerId})`,
      })
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, messageIds))
      .groupBy(messageReactions.messageId, messageReactions.emoji)
      .orderBy(sql`min(${messageReactions.createdAt})`);
  }

  async emojiOn(messageId: bigint): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ emoji: messageReactions.emoji })
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));
    return rows.map((r) => r.emoji);
  }

  // true = it was not there yet.
  async addReaction(messageId: bigint, emoji: string, userId: bigint) {
    const rows = await this.db
      .insert(messageReactions)
      .values({ messageId, emoji, userId })
      .onConflictDoNothing()
      .returning({ userId: messageReactions.userId });
    return rows.length > 0;
  }

  async removeReaction(messageId: bigint, emoji: string, userId: bigint) {
    const rows = await this.db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.emoji, emoji),
          eq(messageReactions.userId, userId),
        ),
      )
      .returning({ userId: messageReactions.userId });
    return rows.length > 0;
  }

  // CR-28 #26: oldest first; a deleted account still answers ("Tài khoản đã bị xóa").
  reactionUsers(messageId: bigint, emoji: string, limit = 100) {
    return this.db
      .select(author)
      .from(messageReactions)
      .innerJoin(users, eq(users.id, messageReactions.userId))
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.emoji, emoji),
        ),
      )
      .orderBy(asc(messageReactions.createdAt), asc(messageReactions.userId))
      .limit(limit);
  }

  async timeoutUntil(serverId: bigint, userId: bigint) {
    const [row] = await this.db
      .select({ until: serverMembers.timeoutUntil })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
    return row?.until ?? null;
  }

  // REQ-MSG-03: which of these users are in the server.
  async memberIds(serverId: bigint, userIds: bigint[]): Promise<bigint[]> {
    if (!userIds.length) return [];
    const rows = await this.db
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          inArray(serverMembers.userId, userIds),
        ),
      );
    return rows.map((r) => r.userId);
  }

  serverRoles(serverId: bigint) {
    return this.db
      .select({ id: roles.id, isMentionable: roles.isMentionable })
      .from(roles)
      .where(eq(roles.serverId, serverId));
  }

  async roleMembers(serverId: bigint, roleIds: bigint[]) {
    if (!roleIds.length) return [];
    return this.db
      .select({
        roleId: serverMemberRoles.roleId,
        userId: serverMemberRoles.userId,
      })
      .from(serverMemberRoles)
      .where(
        and(
          eq(serverMemberRoles.serverId, serverId),
          inArray(serverMemberRoles.roleId, roleIds),
        ),
      );
  }
}
