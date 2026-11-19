import type { MessageCreateEvent, MessageResponse } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import type { LocalMessages } from './LocalMessages';
import type { MessageRepository } from './MessageRepository';
import {
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
};

export type MessageStoreDeps = {
  local: LocalMessages;
  remote: MessageRepository;
  now: () => number;
  newNonce: () => string;
  random?: () => number;
  setTimer: (fn: () => void, ms: number) => () => void;
};

const emptyView = (serverId: string | null): ChannelView => ({
  serverId,
  items: [],
  loading: false,
  error: false,
  reachedStart: false,
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
      // ponytail: a long gap is fetched page after page; 7.3.2 "too far behind → reload the
      // newest page" waits until it is slow in practice.
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

  const sendOne = async (entry: OutboxEntry) => {
    try {
      const message = await remote.send(entry.channelId, {
        content: entry.content,
        nonce: entry.nonce,
      });
      await local.saveMessages([message]);
      await local.removeOutbox(entry.nonce);
      return true;
    } catch (err) {
      const failure = classifySendError(err);
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

    async send(channelId: string, content: string) {
      const now = deps.now();
      await local.addOutbox({
        nonce: deps.newNonce(),
        channelId,
        serverId: state.getState().views[channelId]?.serverId ?? null,
        content,
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

    // S-HOME-04 `failed-message` "Gửi lại": the 24 hours start again (19/11/2026).
    async retry(nonce: string) {
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
    },

    // "Xóa tin nhắn": out of the outbox, never sent.
    async discard(nonce: string) {
      const entry = (await local.outbox()).find((e) => e.nonce === nonce);
      await local.removeOutbox(nonce);
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
