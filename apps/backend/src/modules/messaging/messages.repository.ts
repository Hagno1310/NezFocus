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
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import {
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
} from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import type { AuthorRow } from './messages.dto.js';
import { messages, readStates, type MessageRow } from './messages.schema.js';

export type MessageWithAuthor = { message: MessageRow; author: AuthorRow };
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
  ): Promise<MessageWithAuthor> {
    await this.db.transaction(async (tx) => {
      await tx.insert(messages).values(row);
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

  // REQ-SEARCH-02: by id, so a message sent meanwhile never shifts a page. Oldest first.
  async history(
    channelId: bigint,
    { before, after, around, limit }: MessageHistoryQuery,
  ): Promise<MessageWithAuthor[]> {
    const inChannel = (cond?: SQL) =>
      cond
        ? and(eq(messages.channelId, channelId), cond)
        : eq(messages.channelId, channelId);
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
