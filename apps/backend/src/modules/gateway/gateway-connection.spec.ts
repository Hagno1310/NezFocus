import {
  GatewayCloseCode,
  GatewayOp,
  type CurrentUser,
  type ServerFrame,
  type ServerSummary,
} from '@nezfocus/shared';
import { GatewayConnection, type Authenticate } from './gateway-connection.js';
import { HEARTBEAT_INTERVAL_MS, GatewaySessions } from './gateway-sessions.js';

const user: CurrentUser = {
  id: '7',
  email: 'an@gmail.com',
  username: 'an.nguyen',
  display_name: 'An Nguyễn',
  bio: null,
  avatar: null,
  account_completed: true,
  created_at: '2026-11-05T08:00:00.000Z',
};

const server: ServerSummary = {
  id: '100',
  name: 'Ôn thi Giải tích 2',
  icon_url: null,
  owner_id: '7',
  template: 'study_server',
  system_channel_id: '101',
  member_count: 16,
  created_at: '2026-10-01T08:00:00.000Z',
};

const tokens: Record<string, Awaited<ReturnType<Authenticate>>> = {
  good: { ok: true, userId: 7n, authSessionId: 100n, user },
  other: { ok: true, userId: 7n, authSessionId: 200n, user },
  expired: { ok: false, reason: null },
  revoked: { ok: false, reason: 'revoked' },
};
const authenticate: Authenticate = async (token) =>
  tokens[token] ?? { ok: false, reason: null };

const identify = (token = 'good') =>
  JSON.stringify({
    op: 2,
    d: {
      token,
      device: { platform: 'android', app_version: '0.1.0', device_id: 'd1' },
    },
  });
const resume = (session_id: string, seq: number) =>
  JSON.stringify({ op: 6, d: { token: 'good', session_id, seq } });

let nextId = 1000n;
let sessions: GatewaySessions;

const connect = () => {
  const sent: ServerFrame[] = [];
  const socket = {
    closedWith: null as null | { code: number; reason?: string },
    send: (text: string) => sent.push(JSON.parse(text)),
    close(code: number, reason?: string) {
      this.closedWith = { code, reason };
    },
  };
  const conn = new GatewayConnection(socket, sessions, authenticate);
  conn.open();
  return { conn, sent, socket };
};

const ready = async () => {
  const c = connect();
  await c.conn.receive(identify());
  const r = c.sent.find((f) => f.op === GatewayOp.DISPATCH && f.t === 'READY');
  return { ...c, sessionId: (r!.d as { session_id: string }).session_id };
};

const dispatches = (sent: ServerFrame[]) =>
  sent.filter((f) => f.op === GatewayOp.DISPATCH);

beforeEach(() => {
  vi.useFakeTimers();
  sessions = new GatewaySessions({ next: () => nextId++ });
});
afterEach(() => vi.useRealTimers());

describe('GatewayConnection', () => {
  it('sends HELLO with heartbeat_interval on connect', () => {
    const { sent } = connect();
    expect(sent).toEqual([
      { op: 10, d: { heartbeat_interval: HEARTBEAT_INTERVAL_MS } },
    ]);
  });

  it('IDENTIFY → READY with session_id and user', async () => {
    const { sent, sessionId } = await ready();
    expect(sent[1]).toMatchObject({ op: 0, s: 1, t: 'READY', d: { user } });
    expect(sessionId).toMatch(/^\d+$/);
  });

  it("READY lists the user's servers (REQ-SRV-01)", async () => {
    const asked: bigint[] = [];
    const sent: ServerFrame[] = [];
    const conn = new GatewayConnection(
      { send: (text) => sent.push(JSON.parse(text)), close: () => {} },
      sessions,
      authenticate,
      async (userId) => (asked.push(userId), [server]),
    );
    conn.open();
    await conn.receive(identify());
    expect(sent[1]).toMatchObject({ t: 'READY', d: { servers: [server] } });
    expect(asked).toEqual([7n]);
  });

  describe('closes', () => {
    it('4003 when another op comes before IDENTIFY', async () => {
      const { conn, socket } = connect();
      await conn.receive(
        JSON.stringify({ op: 12, d: { state: 'background' } }),
      );
      expect(socket.closedWith?.code).toBe(GatewayCloseCode.NOT_AUTHENTICATED);
    });

    it('allows HEARTBEAT before IDENTIFY', async () => {
      const { conn, sent, socket } = connect();
      await conn.receive(JSON.stringify({ op: 1, d: null }));
      expect(socket.closedWith).toBeNull();
      expect(sent.at(-1)).toEqual({ op: 11, d: null });
    });

    it('4003 when IDENTIFY never comes, even with heartbeats', async () => {
      const { conn, socket } = connect();
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      await conn.receive(JSON.stringify({ op: 1, d: null }));
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(socket.closedWith?.code).toBe(GatewayCloseCode.NOT_AUTHENTICATED);
    });

    it('4005 on a second IDENTIFY', async () => {
      const { conn, socket } = await ready();
      await conn.receive(identify());
      expect(socket.closedWith?.code).toBe(
        GatewayCloseCode.ALREADY_AUTHENTICATED,
      );
    });

    it('4004 without reason for a bad or expired token', async () => {
      const { conn, socket } = connect();
      await conn.receive(identify('expired'));
      expect(socket.closedWith).toEqual({
        code: GatewayCloseCode.AUTHENTICATION_FAILED,
        reason: '',
      });
    });

    it('4004 with revoke_reason for a revoked session', async () => {
      const { conn, socket } = connect();
      await conn.receive(identify('revoked'));
      expect(socket.closedWith).toEqual({
        code: GatewayCloseCode.AUTHENTICATION_FAILED,
        reason: 'revoked',
      });
    });

    it('4002 on text that is not JSON or a bad payload', async () => {
      const a = connect();
      await a.conn.receive('{nope');
      expect(a.socket.closedWith?.code).toBe(GatewayCloseCode.DECODE_ERROR);
      const b = connect();
      await b.conn.receive(JSON.stringify({ op: 2, d: { token: 'good' } }));
      expect(b.socket.closedWith?.code).toBe(GatewayCloseCode.DECODE_ERROR);
    });

    it('4001 on an opcode the client may not send', async () => {
      const { conn, socket } = await ready();
      await conn.receive(JSON.stringify({ op: 10, d: {} }));
      expect(socket.closedWith?.code).toBe(GatewayCloseCode.UNKNOWN_OPCODE);
    });

    it('4008 past 120 frames in 60 seconds', async () => {
      const { conn, socket } = await ready(); // IDENTIFY = frame 1
      const beat = JSON.stringify({ op: 1, d: 1 });
      for (let i = 0; i < 119; i++) await conn.receive(beat);
      expect(socket.closedWith).toBeNull();
      await conn.receive(beat);
      expect(socket.closedWith?.code).toBe(GatewayCloseCode.RATE_LIMITED);
    });

    it('does not rate limit 120 frames spread past the window', async () => {
      const { conn, socket } = await ready();
      const beat = JSON.stringify({ op: 1, d: 1 });
      for (let i = 0; i < 100; i++) await conn.receive(beat);
      vi.advanceTimersByTime(60_000);
      for (let i = 0; i < 100; i++) await conn.receive(beat);
      expect(socket.closedWith).toBeNull();
    });
  });

  describe('heartbeat', () => {
    it('answers HEARTBEAT with HEARTBEAT_ACK', async () => {
      const { conn, sent } = await ready();
      await conn.receive(JSON.stringify({ op: 1, d: 1 }));
      expect(sent.at(-1)).toEqual({ op: 11, d: null });
    });

    it('closes when no heartbeat arrives in time', async () => {
      const { conn, socket } = await ready();
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      await conn.receive(JSON.stringify({ op: 1, d: 1 }));
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(socket.closedWith).toBeNull();
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(socket.closedWith?.code).toBe(GatewayCloseCode.UNKNOWN_ERROR);
    });
  });

  describe('RESUME', () => {
    it('replays events after seq, then RESUMED', async () => {
      const first = await ready(); // READY = s 1
      await sessions.dispatchToUser(7n, 'USER_UPDATE', user); // s 2
      first.conn.closed();
      await sessions.dispatchToUser(7n, 'USER_UPDATE', user); // s 3, missed

      const second = connect();
      await second.conn.receive(resume(first.sessionId, 2));
      expect(dispatches(second.sent)).toEqual([
        { op: 0, s: 3, t: 'USER_UPDATE', d: user },
        { op: 0, s: 4, t: 'RESUMED', d: {} },
      ]);
    });

    it('INVALID_SESSION(false) once the session expired', async () => {
      const first = await ready();
      first.conn.closed();
      vi.advanceTimersByTime(61_000);
      const second = connect();
      await second.conn.receive(resume(first.sessionId, 1));
      expect(second.sent.at(-1)).toEqual({ op: 9, d: false });
      expect(second.socket.closedWith).toBeNull(); // may IDENTIFY next
    });

    it('INVALID_SESSION(false) when missed events fell out of the buffer', async () => {
      const first = await ready();
      first.conn.closed();
      for (let i = 0; i < 1001; i++)
        await sessions.dispatchToUser(7n, 'USER_UPDATE', user);
      const second = connect();
      await second.conn.receive(resume(first.sessionId, 1));
      expect(second.sent.at(-1)).toEqual({ op: 9, d: false });
    });

    it('INVALID_SESSION(false) for another login session', async () => {
      const first = await ready();
      first.conn.closed();
      const second = connect();
      await second.conn.receive(
        JSON.stringify({
          op: 6,
          d: { token: 'other', session_id: first.sessionId, seq: 1 },
        }),
      );
      expect(second.sent.at(-1)).toEqual({ op: 9, d: false });
    });

    it('keeps the session after RESUME takes over a half-open socket', async () => {
      const first = await ready(); // backend has not noticed the drop
      const second = connect();
      await second.conn.receive(resume(first.sessionId, 1));
      expect(first.socket.closedWith?.code).toBe(
        GatewayCloseCode.UNKNOWN_ERROR,
      );
      vi.advanceTimersByTime(61_000);
      await second.conn.receive(JSON.stringify({ op: 1, d: 2 })); // keep it alive
      await sessions.dispatchToUser(7n, 'USER_UPDATE', user);
      expect(dispatches(second.sent).at(-1)?.t).toBe('USER_UPDATE');
    });

    it('4007 when seq is ahead of the session', async () => {
      const first = await ready();
      first.conn.closed();
      const second = connect();
      await second.conn.receive(resume(first.sessionId, 99));
      expect(second.socket.closedWith?.code).toBe(GatewayCloseCode.INVALID_SEQ);
    });
  });

  describe('GatewaySessions', () => {
    it('dispatches to every session of the user', async () => {
      const a = await ready();
      const b = await ready();
      await sessions.dispatchToUser(7n, 'USER_UPDATE', user);
      expect(dispatches(a.sent).at(-1)?.t).toBe('USER_UPDATE');
      expect(dispatches(b.sent).at(-1)?.t).toBe('USER_UPDATE');
    });

    it('revoking a login session closes its sockets with 4004 + reason', async () => {
      const { socket, sessionId } = await ready();
      sessions.revoke(100n, 'reuse_detected');
      expect(socket.closedWith).toEqual({
        code: GatewayCloseCode.AUTHENTICATION_FAILED,
        reason: 'reuse_detected',
      });
      const again = connect();
      await again.conn.receive(resume(sessionId, 1));
      expect(again.sent.at(-1)).toEqual({ op: 9, d: false });
    });

    it('records APP_STATE per session (DEC-34)', async () => {
      const { conn } = await ready();
      expect(sessions.hasForegroundSession(7n)).toBe(true);
      await conn.receive(
        JSON.stringify({ op: 12, d: { state: 'background' } }),
      );
      expect(sessions.hasForegroundSession(7n)).toBe(false);
    });
  });
});
