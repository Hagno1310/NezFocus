import { Permission } from '@nezfocus/shared';
import { Fanout, type FanoutTarget } from './fanout.js';
import { GatewaySessions } from './gateway-sessions.js';

const SERVER = 1n;
const CHANNEL = 10n;
const DM = 20n;

const setup = (members: bigint[], cannotView: bigint[] = []) => {
  let id = 100n;
  const sessions = new GatewaySessions({ next: () => id++ });
  const received = new Map<bigint, string[]>();
  const connect = (userId: bigint) =>
    sessions.create(userId, userId, {
      sendText: (text) => {
        const { t } = JSON.parse(text) as { t: string };
        received.set(userId, [...(received.get(userId) ?? []), t]);
      },
      close: () => {},
    });
  const hidden = new Set(cannotView);
  const permissionChecks: bigint[] = [];
  const fanout = new Fanout(
    sessions,
    {
      memberIds: async (serverId) => (serverId === SERVER ? members : []),
      findChannel: async (channelId) =>
        channelId === CHANNEL
          ? ({ serverId: SERVER } as never)
          : channelId === DM
            ? ({ serverId: null } as never)
            : undefined,
    },
    {
      can: async (userId, scope, permission) => {
        permissionChecks.push(userId);
        expect(scope).toEqual({ channelId: CHANNEL });
        expect(permission).toBe(Permission.VIEW_CHANNEL);
        return !hidden.has(userId);
      },
    },
  );
  const deliver = (target: FanoutTarget) =>
    fanout.deliver({ target, t: 'USER_UPDATE', d: {} as never });
  const got = (userId: bigint) => received.get(userId)?.length ?? 0;
  return { sessions, connect, deliver, got, permissionChecks, hidden };
};

const ids = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => BigInt(from + i));

describe('Fanout (REQ-MSG-07)', () => {
  it('AC1: 100 members, 20 online, 5 without VIEW_CHANNEL → exactly 15 receive', async () => {
    const members = ids(1000, 100);
    const online = members.slice(0, 20);
    const s = setup(members, online.slice(0, 5));
    online.forEach(s.connect);
    s.connect(5000n); // online but not a member

    await s.deliver({ kind: 'channel', channelId: CHANNEL.toString() });

    expect(online.filter((u) => s.got(u) === 1)).toHaveLength(15);
    expect(online.slice(0, 5).every((u) => s.got(u) === 0)).toBe(true);
    expect(s.got(5000n)).toBe(0);
    // Offline members cost no permission lookup.
    expect(s.permissionChecks.sort()).toEqual(online.sort());
  });

  it('every session of a receiver gets it once', async () => {
    const s = setup([1n]);
    s.connect(1n);
    s.connect(1n);
    await s.deliver({ kind: 'channel', channelId: CHANNEL.toString() });
    expect(s.got(1n)).toBe(2);
  });

  it('a channel with no server (DM, until P2-B3.2) or an unknown one reaches nobody', async () => {
    const s = setup([1n]);
    s.connect(1n);
    await s.deliver({ kind: 'channel', channelId: DM.toString() });
    await s.deliver({ kind: 'channel', channelId: '99' });
    expect(s.got(1n)).toBe(0);
  });

  it('toServer reaches every online member, no permission check', async () => {
    const s = setup([1n, 2n], [1n, 2n]);
    [1n, 2n, 3n].forEach(s.connect);
    await s.deliver({ kind: 'server', serverId: SERVER.toString() });
    expect([s.got(1n), s.got(2n), s.got(3n)]).toEqual([1, 1, 0]);
    expect(s.permissionChecks).toEqual([]);
  });

  it('toUser reaches only that user', async () => {
    const s = setup([]);
    [1n, 2n].forEach(s.connect);
    await s.deliver({ kind: 'user', userId: '1' });
    expect([s.got(1n), s.got(2n)]).toEqual([1, 0]);
  });

  it('a lost VIEW_CHANNEL counts from the next event (ROLE-08 AC3)', async () => {
    const s = setup([1n]);
    s.connect(1n);
    await s.deliver({ kind: 'channel', channelId: CHANNEL.toString() });
    s.hidden.add(1n);
    await s.deliver({ kind: 'channel', channelId: CHANNEL.toString() });
    expect(s.got(1n)).toBe(1);
  });

  describe('subscribers (op 8)', () => {
    const subscribers = (channelId: bigint | null, except?: bigint) =>
      ({
        kind: 'subscribers',
        serverId: SERVER.toString(),
        channelId: channelId?.toString() ?? null,
        except: except?.toString() ?? null,
      }) as const;

    it('reaches only sessions subscribed to the server, filtered by VIEW_CHANNEL, minus `except`', async () => {
      const s = setup([1n, 2n, 3n, 4n], [3n]);
      const [a, b, c, d] = [1n, 2n, 3n, 4n].map(s.connect);
      s.connect(1n); // a second phone of user 1, not subscribed
      for (const x of [a, b, c]) s.sessions.subscribe(x!, SERVER);
      s.sessions.subscribe(d!, 2n);

      await s.deliver(subscribers(CHANNEL, 2n));
      expect([s.got(1n), s.got(2n), s.got(3n), s.got(4n)]).toEqual([
        1, 0, 0, 0,
      ]);

      await s.deliver(subscribers(null));
      expect([s.got(1n), s.got(2n), s.got(3n), s.got(4n)]).toEqual([
        2, 1, 1, 0,
      ]);
    });

    it('a new server replaces the old one, null stops', async () => {
      const s = setup([1n]);
      const a = s.connect(1n);
      s.sessions.subscribe(a, 2n);
      s.sessions.subscribe(a, SERVER);
      await s.deliver(subscribers(null));
      s.sessions.subscribe(a, null);
      await s.deliver(subscribers(null));
      expect(s.got(1n)).toBe(1);
    });

    it('a subscriber who left the server gets nothing', async () => {
      const s = setup([]);
      s.sessions.subscribe(s.connect(1n), SERVER);
      await s.deliver(subscribers(null));
      expect(s.got(1n)).toBe(0);
    });
  });
});
