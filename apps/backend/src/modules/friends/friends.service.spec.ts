import { ErrorCode } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { fixedClock } from '../../common/clock.js';
import { MemoryKeyValueStore } from '../../redis/key-value-store.js';
import type { EventPublisher } from '../gateway/event-publisher.js';
import type { PresenceSink } from '../gateway/presence.service.js';
import type { NotificationService } from '../notifications/notification-service.js';
import {
  pairKey,
  type FriendsRepository,
  type FriendUser,
} from './friends.repository.js';
import { FriendshipStatus, type FriendshipRow } from './friends.schema.js';
import { FriendsService } from './friends.service.js';

const AN = 1n;
const MAI = 2n;
const GIANG = 3n;
const NOW = new Date('2026-11-20T12:48:00Z');

const person = (id: bigint, username: string): FriendUser => ({
  id,
  username,
  displayName: username,
  avatarKey: null,
  bio: null,
});
const PEOPLE = [
  person(AN, 'an.nguyen'),
  person(MAI, 'mai.tran'),
  person(GIANG, 'giang.vo'),
];

// In-memory stand-in for the repository: the rules live in the service.
function setup() {
  const pairs = new Map<string, FriendshipRow>();
  const blocks = new Set<string>();
  const k = (a: bigint, b: bigint) => {
    const { low, high } = pairKey(a, b);
    return `${low}:${high}`;
  };
  const repo = {
    user: async (id: bigint) => PEOPLE.find((p) => p.id === id),
    userByUsername: async (u: string) => PEOPLE.find((p) => p.username === u),
    isPendingDeletion: async (id: bigint) => id === 77n,
    pair: async (a: bigint, b: bigint) => pairs.get(k(a, b)),
    isBlocked: async (a: bigint, b: bigint) => blocks.has(`${a}>${b}`),
    insertRequest: async (r: {
      from: bigint;
      to: bigint;
      message: string | null;
      at: Date;
    }) => {
      if (pairs.has(k(r.from, r.to))) return false;
      const { low, high } = pairKey(r.from, r.to);
      pairs.set(k(r.from, r.to), {
        userIdLow: low,
        userIdHigh: high,
        status: FriendshipStatus.pending,
        requestedBy: r.from,
        requestMessage: r.message,
        createdAt: r.at,
        respondedAt: null,
      });
      return true;
    },
    accept: async (requestedBy: bigint, other: bigint, at: Date) => {
      const row = pairs.get(k(requestedBy, other));
      if (
        !row ||
        row.status !== FriendshipStatus.pending ||
        row.requestedBy !== requestedBy
      )
        return undefined;
      Object.assign(row, {
        status: FriendshipStatus.accepted,
        requestMessage: null,
        respondedAt: at,
      });
      return row;
    },
    deletePair: async (a: bigint, b: bigint) => {
      const row = pairs.get(k(a, b));
      pairs.delete(k(a, b));
      return row;
    },
    block: async (a: bigint, b: bigint) => {
      const gone = pairs.get(k(a, b));
      pairs.delete(k(a, b));
      blocks.add(`${a}>${b}`);
      return { gone, added: true };
    },
    unblock: async (a: bigint, b: bigint) => blocks.delete(`${a}>${b}`),
    friendships: async (me: bigint) =>
      [...pairs.values()]
        .filter((p) => p.userIdLow === me || p.userIdHigh === me)
        .map((pair) => ({
          pair,
          user: PEOPLE.find(
            (u) =>
              u.id ===
              (pair.userIdLow === me ? pair.userIdHigh : pair.userIdLow),
          )!,
        })),
    blocks: async (me: bigint) =>
      [...blocks]
        .filter((b) => b.startsWith(`${me}>`))
        .map((b) => ({
          at: NOW,
          user: PEOPLE.find((u) => `${me}>${u.id}` === b)!,
        })),
    mutualServers: async () => [{ id: 10n, name: 'Ôn thi Giải tích 2' }],
  } as unknown as FriendsRepository;

  const events: {
    to: bigint;
    t: string;
    d: { user?: { id: string }; user_id?: string; type: string };
  }[] = [];
  const items: { to: bigint; type: string; actor: string }[] = [];
  const deleted: unknown[] = [];
  const changed: [bigint, bigint][] = [];
  const service = new FriendsService(
    repo,
    {
      toUser: async (to: bigint, t: string, d: never) =>
        void events.push({ to, t, d }),
    } as unknown as EventPublisher,
    {
      create: async (to: bigint, type: string, data: { actor_id: string }) => {
        items.push({ to, type, actor: data.actor_id });
        return 1n;
      },
      deleteBySource: async (s: unknown) => void deleted.push(s),
    } as unknown as NotificationService,
    {
      relationshipChanged: async (a: bigint, b: bigint) =>
        void changed.push([a, b]),
    } as unknown as PresenceSink,
    new MemoryKeyValueStore(fixedClock(NOW)),
    fixedClock(NOW),
  );
  return { service, pairs, blocks, events, items, deleted, changed };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as AppError).code;
  }
  throw new Error('expected an AppError');
};

const invite = (
  s: FriendsService,
  from: bigint,
  username: string,
  message?: string,
) => s.send(from, message ? { username, message } : { username });

describe('FriendsService (REQ-FRIEND-01..03)', () => {
  it('sends a request with its message: both lists get it, the receiver an item', async () => {
    const t = setup();
    const r = await invite(t.service, AN, 'mai.tran', 'Chào Mai');
    expect(r).toMatchObject({
      type: 'outgoing',
      request_message: 'Chào Mai',
      user: { id: '2' },
    });
    expect(t.events).toEqual([
      {
        to: MAI,
        t: 'RELATIONSHIP_ADD',
        d: expect.objectContaining({
          type: 'incoming',
          user: expect.objectContaining({ id: '1' }),
        }),
      },
      {
        to: AN,
        t: 'RELATIONSHIP_ADD',
        d: expect.objectContaining({ type: 'outgoing' }),
      },
    ]);
    expect(t.items).toEqual([{ to: MAI, type: 'friend_request', actor: '1' }]);
  });

  it('by user_id (from a profile) works without a message; unknown user → 40401', async () => {
    const t = setup();
    expect(
      (await t.service.send(AN, { user_id: '2' })).request_message,
    ).toBeNull();
    expect(await code(t.service.send(AN, { user_id: '99' }))).toBe(
      ErrorCode.NotFound,
    );
  });

  it('REQ-AUTH-10: an account waiting to be deleted → 40303', async () => {
    const t = setup();
    expect(await code(t.service.send(AN, { user_id: '77' }))).toBe(
      ErrorCode.CannotMessageUser,
    );
  });

  it('AC1: the same request again → 40902', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    expect(await code(invite(t.service, AN, 'mai.tran'))).toBe(
      ErrorCode.FriendRequestAlreadyPending,
    );
  });

  it('AC2: already friends → 40908', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    await t.service.update(MAI, AN, { type: 'friend' });
    expect(await code(invite(t.service, AN, 'mai.tran'))).toBe(
      ErrorCode.AlreadyFriends,
    );
  });

  it('AC3: the 51st request of the day → 40029; auto-accepts do not count', async () => {
    const t = setup();
    await invite(t.service, GIANG, 'an.nguyen');
    await invite(t.service, AN, 'giang.vo'); // auto-accept, not counted
    for (let i = 0; i < 49; i++) {
      await invite(t.service, AN, 'mai.tran');
      await t.service.remove(AN, MAI); // cancel: the count stays
    }
    await invite(t.service, AN, 'mai.tran'); // 50th
    await t.service.remove(AN, MAI);
    expect(await code(invite(t.service, AN, 'mai.tran'))).toBe(
      ErrorCode.RateLimited,
    );
  });

  it('AC4 / AC9: blocked either way → 40303 with the same message', async () => {
    const t = setup();
    await t.service.update(MAI, AN, { type: 'blocked' });
    const err = (await invite(t.service, AN, 'mai.tran').catch(
      (e: AppError) => e,
    )) as AppError;
    expect(err.code).toBe(ErrorCode.CannotMessageUser);
    const mine = (await invite(t.service, MAI, 'an.nguyen').catch(
      (e: AppError) => e,
    )) as AppError;
    expect(mine.code).toBe(ErrorCode.CannotMessageUser);
    expect(mine.message).toBe(err.message);
  });

  it('AC9: the blocked one looks the blocker up → a normal card, relationship none', async () => {
    const t = setup();
    await t.service.update(MAI, AN, { type: 'blocked' });
    const card = await t.service.lookup(AN, 'mai.tran');
    expect(card.relationship).toBe('none');
    expect(card.mutual_servers).toEqual([
      { id: '10', name: 'Ôn thi Giải tích 2' },
    ]);
    expect((await t.service.lookup(MAI, 'an.nguyen')).relationship).toBe(
      'blocked',
    );
  });

  it('AC5: they invited me, I invite them → friends; the first sender gets friend_accepted', async () => {
    const t = setup();
    await invite(t.service, GIANG, 'an.nguyen', 'Học chung nhé');
    t.items.length = 0;
    const r = await invite(t.service, AN, 'giang.vo');
    expect(r.type).toBe('friend');
    expect(r.request_message).toBeNull();
    expect(t.items).toEqual([
      { to: GIANG, type: 'friend_accepted', actor: '1' },
    ]);
    expect(t.changed).toEqual([[GIANG, AN]]);
  });

  it('AC7: the 31st lookup in a minute → 40029 with Retry-After; unknown → 40401', async () => {
    const t = setup();
    expect(await code(t.service.lookup(AN, 'nobody'))).toBe(ErrorCode.NotFound);
    for (let i = 0; i < 29; i++) await t.service.lookup(AN, 'mai.tran');
    const err = (await t.service
      .lookup(AN, 'mai.tran')
      .catch((e: AppError) => e)) as AppError;
    expect(err.code).toBe(ErrorCode.RateLimited);
    expect(err.details.retryAfter).toBeGreaterThan(0);
  });

  it('FRIEND-02 AC1 / AC2: accept → RELATIONSHIP_ADD to both, friend_accepted to the sender, message cleared', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran', 'Chào Mai');
    t.events.length = 0;
    t.items.length = 0;
    const r = await t.service.update(MAI, AN, { type: 'friend' });
    expect(r).toMatchObject({
      type: 'friend',
      request_message: null,
      user: { id: '1' },
    });
    expect(t.events.map((e) => [e.to, e.t, e.d.type])).toEqual([
      [AN, 'RELATIONSHIP_ADD', 'friend'],
      [MAI, 'RELATIONSHIP_ADD', 'friend'],
    ]);
    expect(t.items).toEqual([{ to: AN, type: 'friend_accepted', actor: '2' }]);
    expect(t.changed).toEqual([[AN, MAI]]);
  });

  it('accepting my own request or one cancelled meanwhile → 40401', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    expect(await code(t.service.update(AN, MAI, { type: 'friend' }))).toBe(
      ErrorCode.NotFound,
    );
    await t.service.remove(AN, MAI);
    expect(await code(t.service.update(MAI, AN, { type: 'friend' }))).toBe(
      ErrorCode.NotFound,
    );
  });

  it('FRIEND-02 AC3: decline → only the decliner gets RELATIONSHIP_REMOVE, the item goes', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    t.events.length = 0;
    await t.service.remove(MAI, AN);
    expect(t.events).toEqual([
      {
        to: MAI,
        t: 'RELATIONSHIP_REMOVE',
        d: { user_id: '1', type: 'incoming' },
      },
    ]);
    expect(t.deleted).toEqual([
      { friend_request: { from_user_id: AN, to_user_id: MAI } },
    ]);
    expect(t.pairs.size).toBe(0);
  });

  it('cancel → both lists lose it, the item goes', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    t.events.length = 0;
    await t.service.remove(AN, MAI);
    expect(t.events.map((e) => [e.to, e.d])).toEqual([
      [AN, { user_id: '2', type: 'outgoing' }],
      [MAI, { user_id: '1', type: 'incoming' }],
    ]);
    expect(t.deleted).toEqual([
      { friend_request: { from_user_id: AN, to_user_id: MAI } },
    ]);
  });

  it('unfriend → both get RELATIONSHIP_REMOVE friend; nothing to remove → 40401', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    await t.service.update(MAI, AN, { type: 'friend' });
    t.events.length = 0;
    await t.service.remove(MAI, AN);
    expect(t.events.map((e) => [e.to, e.d.type])).toEqual([
      [MAI, 'friend'],
      [AN, 'friend'],
    ]);
    expect(await code(t.service.remove(MAI, AN))).toBe(ErrorCode.NotFound);
  });

  it('FRIEND-03: block drops the friendship; the blocked one only sees it go; unblock restores nothing', async () => {
    const t = setup();
    await invite(t.service, AN, 'mai.tran');
    await t.service.update(MAI, AN, { type: 'friend' });
    t.events.length = 0;
    t.changed.length = 0;
    const r = await t.service.update(AN, MAI, { type: 'blocked' });
    expect(r.type).toBe('blocked');
    expect(t.events.map((e) => [e.to, e.t, e.d.type])).toEqual([
      [MAI, 'RELATIONSHIP_REMOVE', 'friend'],
      [AN, 'RELATIONSHIP_ADD', 'blocked'],
    ]);
    expect(t.changed).toEqual([[AN, MAI]]);
    expect(await t.service.list(AN)).toEqual([
      expect.objectContaining({ type: 'blocked' }),
    ]);
    expect(await t.service.list(MAI)).toEqual([]);

    t.events.length = 0;
    await t.service.remove(AN, MAI);
    expect(t.events).toEqual([
      {
        to: AN,
        t: 'RELATIONSHIP_REMOVE',
        d: { user_id: '2', type: 'blocked' },
      },
    ]);
    expect(await t.service.list(AN)).toEqual([]);
  });

  it('FRIEND-03: blocking someone with a pending request removes the request item too', async () => {
    const t = setup();
    await invite(t.service, GIANG, 'an.nguyen');
    t.events.length = 0;
    await t.service.update(AN, GIANG, { type: 'blocked' });
    expect(t.deleted).toEqual([
      { friend_request: { from_user_id: GIANG, to_user_id: AN } },
    ]);
    expect(t.events[0]).toEqual({
      to: GIANG,
      t: 'RELATIONSHIP_REMOVE',
      d: { user_id: '1', type: 'outgoing' },
    });
  });

  it('cannot befriend or block yourself → 40001', async () => {
    const t = setup();
    expect(await code(invite(t.service, AN, 'an.nguyen'))).toBe(
      ErrorCode.ValidationError,
    );
    expect(await code(t.service.update(AN, AN, { type: 'blocked' }))).toBe(
      ErrorCode.ValidationError,
    );
  });
});
