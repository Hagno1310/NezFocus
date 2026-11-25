import type { MessageResponse } from '@nezfocus/shared';
import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import type { LocalMessages } from '../../domain/messages/LocalMessages';
import type { OutboxEntry, OutboxStatus } from '../../domain/messages/outbox';
import { cachedChannels, cachedMessages, outbox } from '../db/schema';
import { padId, unpadId, type LocalDb } from '../db/types';

type OutboxRow = typeof outbox.$inferSelect;
type OutboxPayload = { content: string; queued_at: number };

const toEntry = (r: OutboxRow): OutboxEntry => {
  const payload = JSON.parse(r.payload) as OutboxPayload;
  return {
    nonce: r.nonce,
    channelId: unpadId(r.channelId ?? ''),
    serverId: r.serverId && unpadId(r.serverId),
    content: payload.content,
    status: r.status as OutboxStatus,
    attempts: r.attempts,
    nextAttemptAt: r.nextAttemptAt,
    lastError: r.lastError,
    createdAt: r.createdAt ?? 0,
    queuedAt: payload.queued_at,
  };
};

// Builder queries only: raw db.all(sql) returns nothing on op-sqlite ≥ 16 with drizzle 0.45.
export function createLocalMessages(db: () => Promise<LocalDb>): LocalMessages {
  const row = (e: OutboxEntry) => ({
    nonce: e.nonce,
    kind: 'message',
    channelId: padId(e.channelId),
    serverId: e.serverId && padId(e.serverId),
    payload: JSON.stringify({
      content: e.content,
      queued_at: e.queuedAt,
    } satisfies OutboxPayload),
    status: e.status,
    attempts: e.attempts,
    nextAttemptAt: e.nextAttemptAt,
    lastError: e.lastError,
    createdAt: e.createdAt,
  });

  const keepNewest = async (d: LocalDb, channelId: string, keep: number) => {
    const [edge] = await d
      .select({ id: cachedMessages.id })
      .from(cachedMessages)
      .where(eq(cachedMessages.channelId, channelId))
      .orderBy(desc(cachedMessages.id))
      .limit(1)
      .offset(keep - 1);
    if (edge)
      await d
        .delete(cachedMessages)
        .where(
          and(
            eq(cachedMessages.channelId, channelId),
            lt(cachedMessages.id, edge.id),
          ),
        );
  };

  return {
    async messages(channelId) {
      const rows = await (
        await db()
      )
        .select({ json: cachedMessages.json })
        .from(cachedMessages)
        .where(eq(cachedMessages.channelId, padId(channelId)))
        .orderBy(asc(cachedMessages.id));
      return rows.map((r) => JSON.parse(r.json) as MessageResponse);
    },

    async saveMessages(messages) {
      if (!messages.length) return;
      const d = await db();
      for (const m of messages) {
        const values = {
          id: padId(m.id),
          channelId: padId(m.channel_id),
          authorId: padId(m.author.id),
          content: m.content,
          json: JSON.stringify(m),
          createdAt: Date.parse(m.created_at),
        };
        await d
          .insert(cachedMessages)
          .values(values)
          .onConflictDoUpdate({ target: cachedMessages.id, set: values });
      }
    },

    async isCached(channelId) {
      const [hit] = await (
        await db()
      )
        .select({ id: cachedChannels.channelId })
        .from(cachedChannels)
        .where(eq(cachedChannels.channelId, padId(channelId)));
      return !!hit;
    },

    async touchChannel(channelId, serverId, now) {
      const values = {
        channelId: padId(channelId),
        serverId: serverId && padId(serverId),
        openedAt: now,
      };
      await (
        await db()
      )
        .insert(cachedChannels)
        .values(values)
        .onConflictDoUpdate({ target: cachedChannels.channelId, set: values });
    },

    async lastOpened(serverId) {
      const [hit] = await (
        await db()
      )
        .select({ id: cachedChannels.channelId })
        .from(cachedChannels)
        .where(eq(cachedChannels.serverId, padId(serverId)))
        .orderBy(desc(cachedChannels.openedAt))
        .limit(1);
      return hit ? unpadId(hit.id) : null;
    },

    async prune(keep, maxChannels, open) {
      const d = await db();
      const channels = await d
        .select({ id: cachedChannels.channelId })
        .from(cachedChannels)
        .orderBy(desc(cachedChannels.openedAt));
      const gone = channels.slice(maxChannels).map((c) => c.id);
      if (gone.length) {
        await d
          .delete(cachedMessages)
          .where(inArray(cachedMessages.channelId, gone));
        await d
          .delete(cachedChannels)
          .where(inArray(cachedChannels.channelId, gone));
      }
      const openId = open && padId(open);
      for (const c of channels.slice(0, maxChannels))
        if (c.id !== openId) await keepNewest(d, c.id, keep);
    },

    async outbox() {
      const rows = await (
        await db()
      )
        .select()
        .from(outbox)
        .orderBy(asc(outbox.createdAt), asc(outbox.nonce));
      return rows.map(toEntry);
    },

    async addOutbox(entry) {
      await (await db()).insert(outbox).values(row(entry));
    },

    async updateOutbox(nonce, patch) {
      const d = await db();
      const [current] = await d
        .select()
        .from(outbox)
        .where(eq(outbox.nonce, nonce));
      if (!current) return;
      const { nonce: _, ...values } = row({ ...toEntry(current), ...patch });
      await d.update(outbox).set(values).where(eq(outbox.nonce, nonce));
    },

    async removeOutbox(nonce) {
      await (await db()).delete(outbox).where(eq(outbox.nonce, nonce));
    },

    async dropServer(serverId) {
      const d = await db();
      const id = padId(serverId);
      const channels = await d
        .select({ id: cachedChannels.channelId })
        .from(cachedChannels)
        .where(eq(cachedChannels.serverId, id));
      const ids = channels.map((c) => c.id);
      if (ids.length) {
        await d
          .delete(cachedMessages)
          .where(inArray(cachedMessages.channelId, ids));
        await d
          .delete(cachedChannels)
          .where(inArray(cachedChannels.channelId, ids));
      }
      await d.delete(outbox).where(eq(outbox.serverId, id));
    },
  };
}
