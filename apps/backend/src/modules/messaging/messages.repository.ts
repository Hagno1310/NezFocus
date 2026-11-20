import { Inject, Injectable } from '@nestjs/common';
import type { MessageHistoryQuery } from '@nezfocus/shared';
import { and, asc, desc, eq, gt, gte, lt, type SQL } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import type { AuthorRow } from './messages.dto.js';
import { messages, type MessageRow } from './messages.schema.js';

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
  async create(row: NewMessage): Promise<MessageWithAuthor> {
    await this.db.transaction(async (tx) => {
      await tx.insert(messages).values(row);
      await tx
        .update(channels)
        .set({ lastMessageId: row.id })
        .where(eq(channels.id, row.channelId));
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
}
