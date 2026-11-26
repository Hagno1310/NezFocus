import {
  ErrorCode,
  type ChannelPinsUpdateEvent,
  type MessageCreateEvent,
  type MessageDeleteEvent,
  type MessageReactionEvent,
  type MessageResponse,
  type MessageUpdateEvent,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import type { UploadRef, Uploads } from '../attachments/uploads';
import type { LocalMessages } from './LocalMessages';
import type { MessageRepository } from './MessageRepository';
import { withReaction, type ReactionOp } from './reactions';
import {
  FILE_BLOCKED,
  afterFailure,
  classifySendError,
  isDue,
  type OutboxEntry,
} from './outbox';

// 7.3.2: at least the newest 50 per opened channel, at most 200 channels.
export const KEEP_PER_CHANNEL = 50;
export const MAX_CACHED_CHANNELS = 200;
const PAGE = 50;
const CATCH_UP_PAGE = 100;
// REQ-MSG-05 link / reply jump: pages walked back to reach an older message.
// ponytail: khi cần mở tin cũ hơn 1000 tin: một cửa sổ `around` riêng, không nối vào cache.
const REVEAL_PAGES = 20;

// A message from the server, or one of mine still in the outbox (pending / retrying / failed).
export type ChatItem =
  | { kind: 'message'; message: MessageResponse }
  | { kind: 'outbox'; entry: OutboxEntry };

export type ChannelView = {
  serverId: string | null;
  items: ChatItem[]; // oldest first
  loading: boolean; // nothing to show yet and the network is being asked
  error: boolean; // S-HOME-01 `error`: no cache and the network failed
  reachedStart: boolean; // the channel's first message is loaded
  revealing: boolean; // walking back to a linked message: Skeleton at the top (02 `message-link`)
};

export type MessageStoreDeps = {
  local: LocalMessages;
  remote: MessageRepository;
  now: () => number;
  newNonce: () => string;
  random?: () => number;
  setTimer: (fn: () => void, ms: number) => () => void;
  uploads?: Pick<Uploads, 'ensure' | 'forget'>; // REQ-MSG-04
};

// An image is not uploaded yet for a reason a retry may fix: like a send without network.
class UploadNotReady extends Error {}

const emptyView = (serverId: string | null): ChannelView => ({
  serverId,
  items: [],
  loading: true, // until the cache is read: S-HOME-01 `loading`, never a flash of `empty`
  error: false,
  reachedStart: false,
  revealing: false,
});

// The one place the app reads and sends channel messages (SRS 7.3.1 sync engine, 8.4.5).
// Screens read `state` through hooks; nothing here touches React or the network directly.
export function createMessageStore(deps: MessageStoreDeps) {
  const { local, remote } = deps;
  const state = createStore<{ views: Record<string, ChannelView> }>(() => ({
    views: {},
  }));

  const patchView = (channelId: string, patch: Partial<ChannelView>) =>
    state.setState((s) => {
      const view = s.views[channelId];
      return view
        ? { views: { ...s.views, [channelId]: { ...view, ...patch } } }
        : s;
    });

  // MSG-09 AC3: an outbox entry whose nonce came back on a message is not shown twice.
  const refresh = async (channelId: string) => {
    if (!state.getState().views[channelId]) return;
    const [messages, outbox] = await Promise.all([
      local.messages(channelId),
      local.outbox(),
    ]);
    const sent = new Set(messages.map((m) => m.nonce).filter(Boolean));
    patchView(channelId, {
      items: [
        ...messages.map((message): ChatItem => ({ kind: 'message', message })),
        ...outbox
          .filter((e) => e.channelId === channelId && !sent.has(e.nonce))
          .map((entry): ChatItem => ({ kind: 'outbox', entry })),
      ],
    });
  };

  // Everything after the newest cached message (7.3.2 delta), or the newest page.
  const fetchNewer = async (channelId: string) => {
    const cached = await local.messages(channelId);
    let after = cached.at(-1)?.id;
    try {
      // ponytail: khi bắt kịp phải tải nhiều trang: tải lại trang mới nhất thay vì đi hết (7.3.2).
      for (;;) {
        const page = await remote.history(
          channelId,
          after ? { after, limit: CATCH_UP_PAGE } : { limit: PAGE },
        );
        await local.saveMessages(page);
        if (!after) patchView(channelId, { reachedStart: page.length < PAGE });
        if (!after || page.length < CATCH_UP_PAGE) break;
        after = page.at(-1)!.id;
      }
      patchView(channelId, { error: false });
    } catch {
      patchView(channelId, { error: cached.length === 0 });
    }
    await refresh(channelId);
  };

  let flushing: Promise<void> | null = null;
  let rerun: { now: boolean } | null = null; // asked again while running
  let cancelTimer: (() => void) | null = null;

  const scheduleNext = (outbox: OutboxEntry[]) => {
    cancelTimer?.();
    cancelTimer = null;
    const next = Math.min(
      ...outbox
        .filter((e) => e.nextAttemptAt !== null)
        .map((e) => e.nextAttemptAt!),
    );
    if (Number.isFinite(next))
      cancelTimer = deps.setTimer(
        () => void flush(),
        Math.max(0, next - deps.now()),
      );
  };

  // S-HOME-05: a message only goes once every image is uploaded and passed `complete`. An
  // image blocked meanwhile fails the message (C-10 `failed · file-blocked`); ids are kept, so
  // a retry does not upload twice. null: blocked.
  const attachmentIdsOf = async (entry: OutboxEntry) => {
    const live = entry.attachments.filter((a) => !a.blocked);
    if (!live.length) return [];
    if (!deps.uploads) throw new UploadNotReady();
    const uploads = deps.uploads;
    const results = await Promise.all(
      live.map((a) => uploads.ensure(entry.channelId, a)),
    );
    const attachments = entry.attachments.map((a) => {
      const r = results[live.indexOf(a)];
      if (!r) return a;
      if (r.ok) return { ...a, attachmentId: r.id };
      return r.kind === 'rejected' ? { ...a, blocked: true } : a;
    });
    await local.updateOutbox(entry.nonce, { attachments });
    if (results.some((r) => !r.ok && r.kind === 'rejected')) return null;
    if (results.some((r) => !r.ok && r.kind === 'refused'))
      throw Object.assign(new Error('upload refused'), { status: 400 });
    if (results.some((r) => !r.ok)) throw new UploadNotReady();
    return results.flatMap((r) => (r.ok ? [r.id] : []));
  };

  const sendOne = async (entry: OutboxEntry) => {
    try {
      const attachmentIds = await attachmentIdsOf(entry);
      if (!attachmentIds) {
        await local.updateOutbox(entry.nonce, {
          status: 'failed',
          nextAttemptAt: null,
          lastError: FILE_BLOCKED,
        });
        return true;
      }
      const message = await remote.send(entry.channelId, {
        content: entry.content,
        nonce: entry.nonce,
        ...(entry.replyToId ? { reply_to_id: entry.replyToId } : {}),
        ...(attachmentIds.length ? { attachment_ids: attachmentIds } : {}),
      });
      await local.saveMessages([message]);
      await local.removeOutbox(entry.nonce);
      deps.uploads?.forget(entry.attachments.map((a) => a.key));
      return true;
    } catch (err) {
      const failure = classifySendError(
        err instanceof UploadNotReady ? new TypeError('upload') : err,
      );
      await local.updateOutbox(
        entry.nonce,
        afterFailure(entry, failure, deps.now(), deps.random),
      );
      return failure.kind !== 'network';
    } finally {
      await refresh(entry.channelId);
    }
  };

  // In the order written, one at a time; a network failure stops the run (offline).
  // `now`: the network just came back, so retrying entries go without waiting their backoff.
  const runFlush = async (now: boolean) => {
    for (const entry of await local.outbox()) {
      const due =
        isDue(entry, deps.now()) || (now && entry.status === 'retrying');
      if (due && !(await sendOne(entry))) break;
    }
    scheduleNext(await local.outbox());
  };

  function flush({ now = false } = {}): Promise<void> {
    if (flushing) {
      rerun = { now: (rerun?.now ?? false) || now };
      return flushing;
    }
    flushing = (async () => {
      try {
        let run: { now: boolean } | null = { now };
        while (run) {
          await runFlush(run.now);
          run = rerun;
          rerun = null;
        }
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  // Rewrites cached messages of a channel; untouched ones are not saved again.
  const rewrite = async (
    channelId: string,
    change: (m: MessageResponse) => MessageResponse,
  ) => {
    const changed = (await local.messages(channelId)).flatMap((m) => {
      const next = change(m);
      return next === m ? [] : [next];
    });
    if (changed.length) await local.saveMessages(changed);
  };

  const reacted = async (
    channelId: string,
    messageId: string,
    emoji: string,
    op: ReactionOp,
    mine: boolean,
  ) => {
    await rewrite(channelId, (m) =>
      m.id === messageId
        ? { ...m, reactions: withReaction(m.reactions, emoji, op, mine) }
        : m,
    );
    await refresh(channelId);
  };

  const pinnedAt = async (
    channelId: string,
    messageId: string,
    at: string | null,
  ) => {
    await rewrite(channelId, (m) =>
      m.id === messageId && (m.pinned_at === null) !== (at === null)
        ? { ...m, pinned_at: at }
        : m,
    );
    await refresh(channelId);
  };

  // REQ-MSG-05 AC3 / AC6: gone here, and replies to it show "Tin nhắn gốc đã bị xóa".
  const deleted = async (channelId: string, messageId: string) => {
    await local.deleteMessage(messageId);
    await rewrite(channelId, (m) =>
      m.reply_to_id === messageId && m.referenced_message
        ? { ...m, referenced_message: null }
        : m,
    );
    await refresh(channelId);
  };

  // S-HOME-04 `failed-message` "Gửi lại": the 24 hours start again (19/11/2026).
  async function retry(nonce: string) {
    await local.updateOutbox(nonce, {
      status: 'pending',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      queuedAt: deps.now(),
    });
    const entry = (await local.outbox()).find((e) => e.nonce === nonce);
    if (entry) await refresh(entry.channelId);
    await flush();
  }

  return {
    state,

    async open(channelId: string, serverId: string | null) {
      if (!state.getState().views[channelId])
        state.setState((s) => ({
          views: { ...s.views, [channelId]: emptyView(serverId) },
        }));
      await local.touchChannel(channelId, serverId, deps.now());
      await local.prune(KEEP_PER_CHANNEL, MAX_CACHED_CHANNELS, channelId);
      await refresh(channelId);
      const empty = !state.getState().views[channelId]?.items.length;
      patchView(channelId, { loading: empty });
      await fetchNewer(channelId);
      patchView(channelId, { loading: false });
    },

    async loadOlder(channelId: string) {
      const oldest = (await local.messages(channelId))[0];
      if (!oldest) return;
      const page = await remote.history(channelId, {
        before: oldest.id,
        limit: PAGE,
      });
      await local.saveMessages(page);
      patchView(channelId, { reachedStart: page.length < PAGE });
      await refresh(channelId);
    },

    // `replyToId`: S-HOME-01 `reply-mode` (REQ-MSG-05); `attachments`: the tray (REQ-MSG-04).
    async send(
      channelId: string,
      content: string,
      replyToId?: string,
      attachments: readonly UploadRef[] = [],
    ) {
      const now = deps.now();
      await local.addOutbox({
        nonce: deps.newNonce(),
        channelId,
        serverId: state.getState().views[channelId]?.serverId ?? null,
        content,
        replyToId: replyToId ?? null,
        attachments: attachments.map((a) => ({ ...a, blocked: false })),
        status: 'pending',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        createdAt: now,
        queuedAt: now,
      });
      await refresh(channelId);
      void flush();
    },

    retry,

    // S-HOME-04 `failed-file-blocked` "Gửi không kèm tệp bị chặn" (CR-19 #7): the rest goes;
    // nothing left to send (no text, every image blocked) → the message goes away.
    async sendWithoutBlocked(nonce: string) {
      const entry = (await local.outbox()).find((e) => e.nonce === nonce);
      if (!entry) return;
      const attachments = entry.attachments.filter((a) => !a.blocked);
      deps.uploads?.forget(
        entry.attachments.filter((a) => a.blocked).map((a) => a.key),
      );
      if (!attachments.length && !entry.content.trim()) {
        await local.removeOutbox(nonce);
        await refresh(entry.channelId);
        return;
      }
      await local.updateOutbox(nonce, { attachments });
      await retry(nonce);
    },

    // "Xóa tin nhắn": out of the outbox, never sent.
    async discard(nonce: string) {
      const entry = (await local.outbox()).find((e) => e.nonce === nonce);
      await local.removeOutbox(nonce);
      deps.uploads?.forget(entry?.attachments.map((a) => a.key) ?? []);
      if (entry) await refresh(entry.channelId);
    },

    flush,

    // MESSAGE_CREATE: echo of mine (nonce) or someone else's, for a channel opened before.
    async applyCreate(message: MessageCreateEvent) {
      if (message.nonce) await local.removeOutbox(message.nonce);
      if (await local.isCached(message.channel_id))
        await local.saveMessages([message]);
      await refresh(message.channel_id);
    },

    // REQ-MSG-05: these need the network (CR-28 #7, no outbox); errors go to the caller.
    async edit(channelId: string, messageId: string, content: string) {
      const message = await remote.edit(channelId, messageId, content);
      await local.saveMessages([message]);
      await refresh(channelId);
    },

    // 02 edge case "Hai người cùng xóa một tin": already gone (40401) is what was wanted.
    async remove(channelId: string, messageId: string) {
      try {
        await remote.remove(channelId, messageId);
      } catch (err) {
        if ((err as { code?: number }).code !== ErrorCode.NotFound) throw err;
      }
      await deleted(channelId, messageId);
    },

    // A chip I already put is removed, any other is put (S-HOME-01 › Tương tác).
    async toggleReaction(channelId: string, messageId: string, emoji: string) {
      const message = (await local.messages(channelId)).find(
        (m) => m.id === messageId,
      );
      const mine = message?.reactions.some((r) => r.emoji === emoji && r.me);
      if (mine) await remote.unreact(channelId, messageId, emoji);
      else await remote.react(channelId, messageId, emoji);
      await reacted(channelId, messageId, emoji, mine ? 'remove' : 'add', true);
    },

    // REQ-MSG-05 AC8 / AC9 before leaving the screen: 40401 (cannot view) throws; false = the
    // channel is fine but the message is gone. A one-message `around` page is enough.
    // No messageId: only whether I can view the channel (a channel link, #95).
    async peek(channelId: string, messageId?: string) {
      if (!messageId) {
        await remote.history(channelId, { limit: 1 });
        return true;
      }
      const page = await remote.history(channelId, {
        around: messageId,
        limit: 2,
      });
      return page.some((m) => m.id === messageId);
    },

    // Loads back from the oldest cached message until `messageId` is in, so the cache stays one
    // run with no hole (7.3.2). `missing`: walked past it (deleted); `far`: not reached in time.
    async reveal(
      channelId: string,
      messageId: string,
    ): Promise<'found' | 'missing' | 'far'> {
      const target = BigInt(messageId);
      const has = async () => {
        const cached = await local.messages(channelId);
        return {
          found: cached.some((m) => m.id === messageId),
          oldest: cached[0],
        };
      };
      let { found, oldest } = await has();
      let past = !oldest || BigInt(oldest.id) <= target;
      if (!found && !past) patchView(channelId, { revealing: true });
      for (let i = 0; !found && !past && i < REVEAL_PAGES; i++) {
        const page = await remote.history(channelId, {
          before: oldest.id,
          limit: PAGE,
        });
        await local.saveMessages(page);
        if (page.length < PAGE) patchView(channelId, { reachedStart: true });
        ({ found, oldest } = await has());
        past = page.length < PAGE || !oldest || BigInt(oldest.id) <= target;
      }
      patchView(channelId, { revealing: false });
      await refresh(channelId);
      return found ? 'found' : past ? 'missing' : 'far';
    },

    reactionUsers: (channelId: string, messageId: string, emoji: string) =>
      remote.reactionUsers(channelId, messageId, emoji),

    // REQ-MSG-10 (CR-28 #7: needs the network; errors go to the caller). The cached copy
    // changes at once, so the sheet offers "Bỏ ghim" before CHANNEL_PINS_UPDATE arrives.
    pins: (channelId: string) => remote.pins(channelId),
    async pin(channelId: string, messageId: string) {
      await remote.pin(channelId, messageId);
      await pinnedAt(channelId, messageId, new Date(deps.now()).toISOString());
    },
    async unpin(channelId: string, messageId: string) {
      await remote.unpin(channelId, messageId);
      await pinnedAt(channelId, messageId, null);
    },
    applyPins: (e: ChannelPinsUpdateEvent) =>
      pinnedAt(e.channel_id, e.message_id, e.pinned_at),

    // MESSAGE_UPDATE: the message, and the reply lines quoting it.
    async applyUpdate(e: MessageUpdateEvent) {
      const { id, content, edited_at } = e;
      await rewrite(e.channel_id, (m) => {
        if (m.id === id)
          return {
            ...m,
            content,
            edited_at,
            mention_user_ids: e.mention_user_ids,
            mention_role_ids: e.mention_role_ids,
            mention_everyone: e.mention_everyone,
          };
        if (m.referenced_message?.id === id)
          return {
            ...m,
            referenced_message: { ...m.referenced_message, content },
          };
        return m;
      });
      await refresh(e.channel_id);
    },

    applyDelete: (e: MessageDeleteEvent) => deleted(e.channel_id, e.id),

    // MESSAGE_REACTION_ADD / REMOVE; my own one again changes nothing (withReaction).
    applyReaction: (e: MessageReactionEvent, op: ReactionOp, myId: string) =>
      reacted(e.channel_id, e.message_id, e.emoji, op, e.user_id === myId),

    // RESUMED / READY after a drop (7.3.2): what each open channel missed, then the outbox.
    async catchUp() {
      await Promise.all(
        Object.keys(state.getState().views).map((id) => fetchNewer(id)),
      );
      await flush({ now: true });
    },

    // S-ME-02 `logout-confirm`: unsent messages are lost with the local DB.
    countPending: async () => (await local.outbox()).length,

    // Kicked or banned (7.3.2), called by P3-A3 (#23).
    async dropServer(serverId: string) {
      await local.dropServer(serverId);
      state.setState((s) => ({
        views: Object.fromEntries(
          Object.entries(s.views).filter(([, v]) => v.serverId !== serverId),
        ),
      }));
    },

    // Signed out: the DB file goes too (AUTH-07); nothing may stay in memory.
    reset() {
      cancelTimer?.();
      cancelTimer = null;
      state.setState({ views: {} });
    },
  };
}

export type MessageStore = ReturnType<typeof createMessageStore>;
