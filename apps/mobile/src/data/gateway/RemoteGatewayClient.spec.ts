import type { CurrentUser, DispatchEvent } from '@nezfocus/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  gatewayStore,
  onGatewayEvent,
} from '../../domain/gateway/gatewayStore';
import { createGatewayClient, type GatewaySocket } from './RemoteGatewayClient';

const INTERVAL = 40_000;
const user: CurrentUser = {
  id: '1',
  email: 'an.nguyen@gmail.com',
  username: 'an.nguyen',
  display_name: 'An',
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};

class FakeSocket implements GatewaySocket {
  sent: { op: number; d: unknown }[] = [];
  closedWith: number | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  constructor(readonly url: string) {}
  send(text: string) {
    this.sent.push(JSON.parse(text));
  }
  close(code = 1000) {
    this.closedWith = code;
  }
  // backend side
  push(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  drop(code = 1006, reason = '') {
    this.onclose?.({ code, reason });
  }
  ops() {
    return this.sent.map((f) => f.op);
  }
}

let sockets: FakeSocket[];
let random: number;
let deps: ReturnType<typeof makeDeps>;
const makeDeps = () => ({
  url: 'ws://backend/gateway',
  createSocket: (url: string) => {
    const s = new FakeSocket(url);
    sockets.push(s);
    return s;
  },
  getToken: vi.fn(async () => 'access-1' as string | null),
  refreshToken: vi.fn(async () => 'access-2' as string | null),
  device: async () => ({
    platform: 'android' as const,
    app_version: '0.1.0',
    device_id: 'd1',
  }),
  random: () => random,
  onSessionEnded: vi.fn(),
  onUpgradeRequired: vi.fn(),
});
const last = () => sockets.at(-1)!;
const flush = () => vi.advanceTimersByTimeAsync(0);

// Connect, HELLO, IDENTIFY → READY with session 42 at s 1.
async function connected(client = createGatewayClient(deps)) {
  client.start();
  last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
  await flush();
  last().push({ op: 0, s: 1, t: 'READY', d: { session_id: '42', user } });
  return client;
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
  random = 1;
  deps = makeDeps();
  gatewayStore.setState({ status: 'idle' });
});
afterEach(() => vi.useRealTimers());

describe('RemoteGatewayClient', () => {
  it('connects with v=1, IDENTIFYs on HELLO and is connected after READY', async () => {
    const client = createGatewayClient(deps);
    client.start();
    expect(last().url).toBe('ws://backend/gateway?v=1&encoding=json');
    expect(gatewayStore.getState().status).toBe('connecting');
    last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
    await flush();
    expect(last().sent[0]).toEqual({
      op: 2,
      d: {
        token: 'access-1',
        device: { platform: 'android', app_version: '0.1.0', device_id: 'd1' },
      },
    });
    last().push({ op: 0, s: 1, t: 'READY', d: { session_id: '42', user } });
    expect(gatewayStore.getState().status).toBe('connected');
  });

  it('delivers DISPATCH events to subscribers', async () => {
    const events: DispatchEvent[] = [];
    const off = onGatewayEvent((e) => events.push(e));
    const client = await connected();
    last().push({ op: 0, s: 2, t: 'USER_UPDATE', d: user });
    off();
    expect(events.map((e) => e.t)).toEqual(['READY', 'USER_UPDATE']);
    client.stop();
  });

  it('RESUMEs with session_id and the last seq after a drop', async () => {
    await connected();
    last().push({ op: 0, s: 2, t: 'USER_UPDATE', d: user });
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
    await flush();
    expect(last().sent[0]).toEqual({
      op: 6,
      d: { token: 'access-1', session_id: '42', seq: 2 },
    });
  });

  describe('heartbeat', () => {
    it('sends the first heartbeat after interval × random, then every interval', async () => {
      random = 0.25;
      await connected();
      await vi.advanceTimersByTimeAsync(INTERVAL * 0.25 - 1);
      expect(last().ops()).toEqual([2]);
      await vi.advanceTimersByTimeAsync(1);
      expect(last().sent.at(-1)).toEqual({ op: 1, d: 1 });
      last().push({ op: 11, d: null });
      await vi.advanceTimersByTimeAsync(INTERVAL);
      expect(last().ops()).toEqual([2, 1, 1]);
    });

    it('answers a heartbeat request at once', async () => {
      await connected();
      last().push({ op: 1, d: null });
      expect(last().sent.at(-1)).toEqual({ op: 1, d: 1 });
    });

    it('closes and reconnects after 2 missed ACKs', async () => {
      await connected();
      const first = last();
      await vi.advanceTimersByTimeAsync(INTERVAL); // beat 1, no ACK
      await vi.advanceTimersByTimeAsync(INTERVAL); // beat 2, 1 missed
      expect(first.closedWith).toBeNull();
      await vi.advanceTimersByTimeAsync(INTERVAL); // 2 missed
      expect(first.closedWith).not.toBeNull();
      expect(gatewayStore.getState().status).toBe('connecting');
      await vi.advanceTimersByTimeAsync(1000);
      expect(sockets).toHaveLength(2);
    });
  });

  it('backs off 1, 2, 4 … 30 s with jitter while the backend is unreachable', async () => {
    const client = createGatewayClient(deps);
    client.start();
    const waits: number[] = [];
    for (let i = 0; i < 7; i++) {
      const before = sockets.length;
      last().drop();
      let waited = 0;
      while (sockets.length === before) {
        await vi.advanceTimersByTimeAsync(100);
        waited += 100;
      }
      waits.push(waited);
    }
    expect(waits).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);

    random = 0; // jitter can halve the wait
    const before = sockets.length;
    last().drop();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(sockets.length).toBe(before + 1);
  });

  it('resets the backoff after READY', async () => {
    const client = await connected(); // attempt counter 0
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    last().drop();
    await vi.advanceTimersByTimeAsync(2000);
    last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
    await flush();
    last().push({ op: 0, s: 2, t: 'RESUMED', d: {} });
    const count = sockets.length;
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets.length).toBe(count + 1);
    client.stop();
  });

  describe('close codes (SRS 11.2)', () => {
    it('4004 with a reason ends the session and stays closed', async () => {
      await connected();
      last().drop(4004, 'reuse_detected');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(deps.onSessionEnded).toHaveBeenCalledWith('reuse_detected');
      expect(sockets).toHaveLength(1);
    });

    it('4004 without reason refreshes the token and IDENTIFYs again', async () => {
      await connected();
      last().drop(4004, '');
      await flush();
      expect(deps.refreshToken).toHaveBeenCalled();
      expect(sockets).toHaveLength(2);
      deps.getToken.mockResolvedValue('access-2');
      last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
      await flush();
      expect(last().sent[0]).toMatchObject({ op: 6, d: { token: 'access-2' } });
    });

    it('4004 without reason and a failed refresh stays closed', async () => {
      deps.refreshToken.mockResolvedValue(null);
      await connected();
      last().drop(4004, '');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(sockets).toHaveLength(1);
      expect(gatewayStore.getState().status).toBe('idle');
    });

    it('4004 without reason retries later when the refresh cannot reach the backend', async () => {
      deps.refreshToken.mockRejectedValueOnce(new Error('offline'));
      await connected();
      last().drop(4004, '');
      await vi.advanceTimersByTimeAsync(1000);
      expect(sockets).toHaveLength(2);
    });

    it('4010 asks for an app update and stays closed', async () => {
      await connected();
      last().drop(4010);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(deps.onUpgradeRequired).toHaveBeenCalled();
      expect(sockets).toHaveLength(1);
    });

    for (const code of [4007, 4009]) {
      it(`${code} reconnects with a new IDENTIFY`, async () => {
        await connected();
        last().drop(code);
        await vi.advanceTimersByTimeAsync(1000);
        last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
        await flush();
        expect(last().sent[0].op).toBe(2);
      });
    }

    it('INVALID_SESSION(false) IDENTIFYs again on the same socket', async () => {
      await connected();
      last().drop();
      await vi.advanceTimersByTimeAsync(1000);
      last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
      await flush();
      last().push({ op: 9, d: false });
      await flush();
      expect(last().ops()).toEqual([6, 2]);
    });
  });

  describe('app state (DEC-34, SRS 7.3.3)', () => {
    it('sends APP_STATE on every change', async () => {
      const client = await connected();
      client.setAppState('background');
      client.setAppState('foreground');
      expect(last().sent.slice(-2)).toEqual([
        { op: 12, d: { state: 'background' } },
        { op: 12, d: { state: 'foreground' } },
      ]);
    });

    it('closes 30 s into the background and RESUMEs on return', async () => {
      const client = await connected();
      client.setAppState('background');
      await vi.advanceTimersByTimeAsync(30_000);
      expect(last().closedWith).toBe(1000);
      last().drop(1000);
      expect(gatewayStore.getState().status).toBe('paused');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(sockets).toHaveLength(1);

      client.setAppState('foreground');
      expect(sockets).toHaveLength(2);
      last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
      await flush();
      expect(last().sent[0].op).toBe(6);
    });
  });

  describe('network (S-MOD-04, parent #5 "Xong khi")', () => {
    it('drops the socket when the network goes, RESUMEs as soon as it is back', async () => {
      const client = await connected();
      for (let i = 0; i < 4; i++) {
        last().drop(); // pile up backoff
        await vi.advanceTimersByTimeAsync(30_000);
      }
      last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
      await flush();
      last().push({ op: 0, s: 2, t: 'RESUMED', d: {} });

      client.setOnline(false);
      expect(sockets.at(-1)!.closedWith).not.toBeNull();
      expect(gatewayStore.getState().status).toBe('connecting');
      const count = sockets.length;
      client.setOnline(true);
      expect(sockets).toHaveLength(count + 1);
      last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
      await flush();
      expect(last().sent[0].op).toBe(6);
    });
  });

  it('4004 without reason twice in a row backs off instead of spinning', async () => {
    await connected();
    last().drop(4004, '');
    await flush();
    expect(sockets).toHaveLength(2);
    last().drop(4004, '');
    await flush();
    expect(sockets).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(sockets).toHaveLength(3);
  });

  it('stays closed when the app went to the background during a refresh', async () => {
    let finish: (token: string) => void = () => {};
    deps.refreshToken.mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );
    const client = await connected();
    client.setAppState('background');
    last().drop(4004, '');
    await vi.advanceTimersByTimeAsync(30_000);
    finish('access-2');
    await flush();
    expect(sockets).toHaveLength(1);
    expect(gatewayStore.getState().status).toBe('paused');
  });

  it('stop() closes and forgets the session', async () => {
    const client = await connected();
    client.stop();
    expect(sockets[0].closedWith).toBe(1000);
    expect(gatewayStore.getState().status).toBe('idle');
    client.start();
    last().push({ op: 10, d: { heartbeat_interval: INTERVAL } });
    await flush();
    expect(last().sent[0].op).toBe(2);
  });
});
