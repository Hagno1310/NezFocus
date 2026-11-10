import {
  ClientFrame,
  GatewayCloseCode,
  GatewayOp,
  ServerFrame,
} from './gateway.contract.js';
import { DispatchEvents, parseDispatch } from './events.contract.js';

const identify = {
  op: 2,
  d: {
    token: 'jwt',
    device: { platform: 'android', app_version: '0.1.0', device_id: 'dev-1' },
  },
};

describe('gateway contract', () => {
  it('has every opcode of SRS 5.4 and close code of SRS 11.2', () => {
    expect(Object.values(GatewayOp).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(Object.values(GatewayCloseCode).sort((a, b) => a - b)).toEqual([
      4000, 4001, 4002, 4003, 4004, 4005, 4007, 4008, 4009, 4010, 4011,
    ]);
  });

  describe('ClientFrame', () => {
    it('accepts IDENTIFY, RESUME, HEARTBEAT and APP_STATE', () => {
      for (const frame of [
        identify,
        { op: 6, d: { token: 'jwt', session_id: '42', seq: 7 } },
        { op: 1, d: 7 },
        { op: 1, d: null },
        { op: 12, d: { state: 'background' } },
      ])
        expect(ClientFrame.safeParse(frame).success).toBe(true);
    });

    it('rejects a backend-only or unknown opcode', () => {
      expect(ClientFrame.safeParse({ op: 10, d: {} }).success).toBe(false);
      expect(ClientFrame.safeParse({ op: 13, d: null }).success).toBe(false);
    });

    it('rejects IDENTIFY without a token', () => {
      const { token: _, ...d } = identify.d;
      expect(ClientFrame.safeParse({ op: 2, d }).success).toBe(false);
    });

    it('rejects RESUME without seq', () => {
      expect(
        ClientFrame.safeParse({ op: 6, d: { token: 'jwt', session_id: '42' } })
          .success,
      ).toBe(false);
    });
  });

  describe('ServerFrame', () => {
    it('accepts HELLO, DISPATCH and INVALID_SESSION', () => {
      for (const frame of [
        { op: 10, d: { heartbeat_interval: 41250 } },
        { op: 0, d: {}, s: 1, t: 'RESUMED' },
        { op: 9, d: false },
        { op: 11, d: null },
      ])
        expect(ServerFrame.safeParse(frame).success).toBe(true);
    });

    it('rejects DISPATCH without s or t', () => {
      expect(ServerFrame.safeParse({ op: 0, d: {}, t: 'READY' }).success).toBe(
        false,
      );
      expect(ServerFrame.safeParse({ op: 0, d: {}, s: 1 }).success).toBe(false);
    });
  });

  describe('dispatch events', () => {
    const user = {
      id: '1',
      email: 'an@gmail.com',
      username: 'an.nguyen',
      display_name: 'An Nguyễn',
      account_completed: true,
      created_at: '2026-11-05T08:00:00.000Z',
    };

    it('parses a declared event by its t', () => {
      const event = parseDispatch({ op: 0, s: 3, t: 'USER_UPDATE', d: user });
      expect(event).toEqual({ t: 'USER_UPDATE', s: 3, d: user });
    });

    it('parses READY of a user with no server yet', () => {
      const d = {
        session_id: '42',
        user,
        servers: [],
        preferred_status: 'online',
        presences: [],
      };
      expect(DispatchEvents.READY.parse(d)).toEqual(d);
    });

    it('returns null for an event this build does not know', () => {
      expect(parseDispatch({ op: 0, s: 3, t: 'FUTURE_EVENT', d: {} })).toBe(
        null,
      );
    });

    it('throws when a known event has a bad payload', () => {
      expect(() =>
        parseDispatch({ op: 0, s: 3, t: 'USER_UPDATE', d: { id: 'x' } }),
      ).toThrow();
    });
  });
});
