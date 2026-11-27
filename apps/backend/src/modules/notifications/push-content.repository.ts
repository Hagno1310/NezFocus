import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { attachments } from '../attachments/attachments.schema.js';
import { channelRecipients } from '../channels/dm.schema.js';
import { friendships } from '../friends/friends.schema.js';
import { messages } from '../messaging/messages.schema.js';
import { channels, roles } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import type { PushNames } from './push-text.js';

export type PushMessage = {
  content: string;
  authorId: bigint;
  channelId: bigint;
  channelName: string | null;
  serverId: bigint | null;
  images: number;
};

// Read-only: what the push text needs from other modules' tables (REQ-NOTIF-02).
@Injectable()
export class PushContentRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // undefined: deleted before the push went out.
  async message(id: bigint): Promise<PushMessage | undefined> {
    const [row] = await this.db
      .select({
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        channelName: channels.name,
        serverId: channels.serverId,
      })
      .from(messages)
      .innerJoin(channels, eq(channels.id, messages.channelId))
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)));
    if (!row) return undefined;
    const [files] = await this.db
      .select({ n: count() })
      .from(attachments)
      .where(eq(attachments.messageId, id));
    return { ...row, images: files?.n ?? 0 };
  }

  // Display name, else username (S-HOME-01 shows the same).
  async people(ids: bigint[]) {
    const map = new Map<string, { name: string; username: string }>();
    if (!ids.length) return map;
    const rows = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      })
      .from(users)
      .where(inArray(users.id, ids));
    for (const r of rows)
      if (r.username)
        map.set(String(r.id), {
          name: r.displayName ?? r.username,
          username: r.username,
        });
    return map;
  }

  async names(
    userIds: string[],
    roleIds: string[],
    channelIds: string[],
  ): Promise<PushNames> {
    const people = await this.people(userIds.map(BigInt));
    const roleRows = roleIds.length
      ? await this.db
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(inArray(roles.id, roleIds.map(BigInt)))
      : [];
    const channelRows = channelIds.length
      ? await this.db
          .select({ id: channels.id, name: channels.name })
          .from(channels)
          .where(inArray(channels.id, channelIds.map(BigInt)))
      : [];
    return {
      users: new Map([...people].map(([id, p]) => [id, p.name])),
      roles: new Map(roleRows.map((r) => [String(r.id), r.name])),
      channels: new Map(
        channelRows.flatMap((c) => (c.name ? [[String(c.id), c.name]] : [])),
      ),
    };
  }

  async roleName(id: string) {
    const [row] = await this.db
      .select({ name: roles.name })
      .from(roles)
      .where(eq(roles.id, BigInt(id)));
    return row?.name;
  }

  // REQ-FRIEND-01 (CR-25): the note sent with the request; null when there is none.
  async requestNote(from: bigint, to: bigint) {
    const [low, high] = from < to ? [from, to] : [to, from];
    const [row] = await this.db
      .select({ note: friendships.requestMessage })
      .from(friendships)
      .where(
        and(
          eq(friendships.userIdLow, low),
          eq(friendships.userIdHigh, high),
          eq(friendships.requestedBy, from),
        ),
      );
    return row?.note ?? null;
  }

  async dmRecipients(channelId: bigint) {
    const rows = await this.db
      .select({ userId: channelRecipients.userId })
      .from(channelRecipients)
      .where(eq(channelRecipients.channelId, channelId));
    return rows.map((r) => r.userId);
  }
}
