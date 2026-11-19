import {
  ErrorCode,
  type CreateMessageRequest,
  type MessageHistoryQuery,
  type MessageResponse,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../../data/db/testDb';
import { createLocalMessages } from '../../data/messages/localMessages';
import type { LocalMessages } from './LocalMessages';
import type { MessageRepository } from './MessageRepository';
import { createMessageStore, type ChatItem } from './messageStore';

const T0 = Date.UTC(2026, 10, 19, 13, 0);

const msg = (
  id: string,
  over: Partial<MessageResponse> = {},
): MessageResponse =>
  ({
    id,
    channel_id: '7',
    author: {
      id: '1',
      username: 'an.nguyen',
      display_name: 'An',
      avatar: null,
    },
    type: 'default',
    content: `Tin ${id}`,
    nonce: null,
    mention_user_ids: [],
    mention_role_ids: [],
    mention_everyone: false,
    system_data: null,
    reply_to_id: null,
    edited_at: null,
    pinned_at: null,
    created_at: '2026-11-19T13:00:00.000Z',
    ...over,
  }) as MessageResponse;

type Call = {
  body: CreateMessageRequest;
  resolve: (m: MessageResponse) => void;
  reject: (e: unknown) => void;
};

// A server we answer by hand; `history` serves `messages` by cursor like REQ-SEARCH-02.
function fakeRemote(messages: MessageResponse[] = []) {
  const sends: Call[] = [];
  const queries: Partial<MessageHistoryQuery>[] = [];
  let offline = false;
  const remote: MessageRepository = {
    async history(_channelId, q) {
      queries.push(q);
      if (offline) throw new TypeError('Network request failed');
      const limit = q.limit ?? 50;
      const n = (id: string) => BigInt(id);
      if (q.before)
        return messages.filter((m) => n(m.id) < n(q.before!)).slice(-limit);
      if (q.after)
        return messages.filter((m) => n(m.id) > n(q.after!)).slice(0, limit);
      return messages.slice(-limit);
    },
    send: (_channelId, body) =>
      new Promise((resolve, reject) => sends.push({ body, resolve, reject })),
  };
  return {
    remote,
    sends,
    queries,
    messages,
    goOffline: (v = true) => (offline = v),
  };
}

function setup(
  server = fakeRemote(),
  local: LocalMessages = createLocalMessages(
    (() => {
      const db = createTestDb();
      return async () => db;
    })(),
  ),
) {
  let now = T0;
  let nonces = 0;
  const timers: { at: number; fn: () => void }[] = [];
  const store = createMessageStore({
    local,
    remote: server.remote,
    now: () => now,
    newNonce: () => `nonce-${++nonces}`,
    random: () => 1,
    setTimer: (fn, ms) => {
      const t = { at: now + ms, fn };
      timers.push(t);
      return () => timers.splice(timers.indexOf(t), 1);
    },
  });
  const settle = async () => {
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
  };
  const tick = async (ms: number) => {
    now += ms;
    for (const t of timers.filter((x) => x.at <= now)) {
      timers.splice(timers.indexOf(t), 1);
      t.fn();
    }
    await settle();
  };
  const items = (channelId = '7'): ChatItem[] =>
    store.state.getState().views[channelId]?.items ?? [];
  const shown = (channelId = '7') =>
    items(channelId).map((i) =>
      i.kind === 'message'
        ? i.message.id
        : `${i.entry.status}:${i.entry.content}`,
    );
  return { store, server, local, items, shown, settle, tick };
}

describe('history (REQ-SEARCH-02, 7.3.2)', () => {
  it('first open fetches the newest page; reopening shows the cache, then asks after= it', async () => {
    const server = fakeRemote([msg('1'), msg('2')]);
    const { store, shown, local } = setup(server);
    await store.open('7', '9');
    expect(shown()).toEqual(['1', '2']);
    expect(server.queries.at(-1)).toEqual({ limit: 50 });

    server.messages.push(msg('3'));
    const again = setup(server, local);
    const seen: string[][] = [];
    again.store.state.subscribe(() => {
      const shown = again.shown();
      if (shown.length) seen.push(shown);
    });
    await again.store.open('7', '9');
    expect(seen[0]).toEqual(['1', '2']); // the cache first
    expect(server.queries.at(-1)).toEqual({ after: '2', limit: 100 });
    expect(again.shown()).toEqual(['1', '2', '3']);
  });

  it('offline: cached messages stay, no error; nothing cached is an error', async () => {
    const server = fakeRemote([msg('1')]);
    const { store, local } = setup(server);
    await store.open('7', '9');
    server.goOffline();
    const again = setup(server, local);
    await again.store.open('7', '9');
    expect(again.shown()).toEqual(['1']);
    expect(again.store.state.getState().views['7']!.error).toBe(false);

    const empty = setup(server);
    await empty.store.open('7', '9');
    expect(empty.store.state.getState().views['7']!.error).toBe(true);
  });

  it('loads 50 older at a time and knows when it reached the start', async () => {
    const all = Array.from({ length: 80 }, (_, i) => msg(String(i + 1)));
    const { store, shown } = setup(fakeRemote(all));
    await store.open('7', '9');
    expect(shown()).toHaveLength(50);
    await store.loadOlder('7');
    expect(shown()).toHaveLength(80);
    expect(store.state.getState().views['7']!.reachedStart).toBe(true);
  });
});

describe('sending through the outbox (REQ-MSG-09, 8.4.5)', () => {
  it('shows the message pending at once, then the real one', async () => {
    const { store, server, shown, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'Chào cả nhóm');
    expect(shown()).toEqual(['pending:Chào cả nhóm']);
    await settle();
    expect(server.sends[0]!.body).toEqual({
      content: 'Chào cả nhóm',
      nonce: 'nonce-1',
    });
    server.sends[0]!.resolve(
      msg('10', { nonce: 'nonce-1', content: 'Chào cả nhóm' }),
    );
    await settle();
    expect(shown()).toEqual(['10']);
    expect(await store.countPending()).toBe(0);
  });

  it('AC3: MESSAGE_CREATE before the 201 → one copy', async () => {
    const { store, server, shown, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'Một bản thôi');
    await settle();
    const real = msg('10', { nonce: 'nonce-1', content: 'Một bản thôi' });
    await store.applyCreate({ ...real, server_id: '9' });
    expect(shown()).toEqual(['10']);
    server.sends[0]!.resolve(real);
    await settle();
    expect(shown()).toEqual(['10']);
  });

  it('AC3: the 201 before MESSAGE_CREATE → one copy', async () => {
    const { store, server, shown, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'Một bản thôi');
    await settle();
    const real = msg('10', { nonce: 'nonce-1', content: 'Một bản thôi' });
    server.sends[0]!.resolve(real);
    await settle();
    await store.applyCreate({ ...real, server_id: '9' });
    expect(shown()).toEqual(['10']);
  });

  it('AC1: no network → retrying with the same nonce, sent once it is back', async () => {
    const { store, server, shown, settle, tick } = setup();
    await store.open('7', '9');
    await store.send('7', 'Mạng chập chờn');
    await settle();
    server.sends[0]!.reject(new TypeError('Network request failed'));
    await settle();
    expect(shown()).toEqual(['retrying:Mạng chập chờn']);
    await tick(1000);
    expect(server.sends[1]!.body.nonce).toBe('nonce-1');
    server.sends[1]!.resolve(msg('10', { nonce: 'nonce-1' }));
    await settle();
    expect(shown()).toEqual(['10']);
  });

  it('back online sends a retrying message at once, not after its backoff', async () => {
    const { store, server, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'Gửi khi có mạng');
    await settle();
    server.sends[0]!.reject(new TypeError('offline'));
    await settle();
    void store.flush({ now: true });
    await settle();
    expect(server.sends).toHaveLength(2);
  });

  it('a refused message fails; "Gửi lại" queues it again, "Xóa" drops it', async () => {
    const { store, server, shown, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'Không có quyền');
    await settle();
    server.sends[0]!.reject({ status: 403, code: ErrorCode.Forbidden });
    await settle();
    expect(shown()).toEqual(['failed:Không có quyền']);
    void store.retry('nonce-1');
    await settle();
    expect(server.sends[1]!.body.nonce).toBe('nonce-1');
    server.sends[1]!.reject({ status: 403, code: ErrorCode.Forbidden });
    await settle();
    await store.discard('nonce-1');
    expect(shown()).toEqual([]);
    expect(await store.countPending()).toBe(0);
  });

  it('MSG-08 AC1: 40029 fails and goes again by itself after Retry-After', async () => {
    const { store, server, shown, settle, tick } = setup();
    await store.open('7', '9');
    await store.send('7', 'Nhanh quá');
    await settle();
    server.sends[0]!.reject({
      status: 429,
      code: ErrorCode.RateLimited,
      retry_after: 5,
    });
    await settle();
    expect(shown()).toEqual(['failed:Nhanh quá']);
    await tick(4999);
    expect(server.sends).toHaveLength(1);
    await tick(1);
    expect(server.sends).toHaveLength(2);
  });

  it('sends in the order written, one at a time', async () => {
    const { store, server, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'một');
    await store.send('7', 'hai');
    await settle();
    expect(server.sends.map((s) => s.body.content)).toEqual(['một']);
    server.sends[0]!.resolve(msg('10', { nonce: 'nonce-1' }));
    await settle();
    await settle();
    expect(server.sends.map((s) => s.body.content)).toEqual(['một', 'hai']);
  });

  it('killed with a pending message: the next start sends it with the same nonce', async () => {
    const server = fakeRemote();
    const first = setup(server);
    await first.store.open('7', '9');
    await first.store.send('7', 'Trước khi tắt app');
    await first.settle();
    const restarted = setup(server, first.local);
    void restarted.store.flush();
    await restarted.settle();
    expect(server.sends.map((s) => s.body.nonce)).toEqual([
      'nonce-1',
      'nonce-1',
    ]);
  });

  it('dropServer forgets that server’s unsent messages (7.3.2)', async () => {
    const { store, server, settle } = setup();
    await store.open('7', '9');
    await store.send('7', 'Sắp bị mời ra');
    await settle();
    server.sends[0]!.reject(new TypeError('offline'));
    await settle();
    await store.dropServer('9');
    expect(await store.countPending()).toBe(0);
    expect(store.state.getState().views['7']).toBeUndefined();
  });
});

describe('Gateway', () => {
  it('MESSAGE_CREATE joins a cached channel, never one not opened yet', async () => {
    const { store, shown } = setup();
    await store.open('7', '9');
    await store.applyCreate({ ...msg('20'), server_id: '9' });
    await store.applyCreate({
      ...msg('21', { channel_id: '8' }),
      server_id: '9',
    });
    expect(shown()).toEqual(['20']);
    expect(shown('8')).toEqual([]);
  });

  it('after a reconnect it fetches what it missed, in order', async () => {
    const server = fakeRemote([msg('1')]);
    const { store, shown } = setup(server);
    await store.open('7', '9');
    server.messages.push(msg('2'), msg('3'));
    await store.catchUp();
    expect(shown()).toEqual(['1', '2', '3']);
  });
});
