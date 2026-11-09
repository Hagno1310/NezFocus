import {
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE_PERMISSIONS as DEFAULTS,
  Permission as P,
} from '@nezfocus/shared';
import { fixedClock } from '../../common/clock.js';
import { MemoryKeyValueStore } from '../../redis/key-value-store.js';
import { DbPermissionService } from './db-permission.service.js';
import { PermissionCache } from './permission-cache.js';
import type {
  ChannelFacts,
  MemberFacts,
  PermissionsRepository,
} from './permissions.repository.js';

// "Ôn thi Giải tích 2" (id 1000): Owner An (1); Chi (3) holds Điều phối (1001); Dũng (4) none.
const SERVER = 1000n;
const AN = 1n;
const CHI = 3n;
const DUNG = 4n;

function world() {
  const facts = {
    ownerId: AN,
    roles: [
      { id: SERVER, permissions: DEFAULTS, position: 0 },
      { id: 1001n, permissions: P.MANAGE_STUDY_ROOMS, position: 1 },
    ],
    members: new Map<bigint, MemberFacts>([
      [AN, { roleIds: [], timeoutUntil: null }],
      [CHI, { roleIds: [1001n], timeoutUntil: null }],
      [DUNG, { roleIds: [], timeoutUntil: null }],
    ]),
  };
  const channels = new Map<bigint, ChannelFacts>([
    // PHÒNG HỌC: @everyone deny CONNECT; "Phòng 1" follows it, #thong-bao has its own
    [
      20n,
      {
        id: 20n,
        serverId: SERVER,
        type: 0,
        parentId: null,
        permissionsSynced: true,
        deletedAt: null,
      },
    ],
    [
      21n,
      {
        id: 21n,
        serverId: SERVER,
        type: 2,
        parentId: 20n,
        permissionsSynced: true,
        deletedAt: null,
      },
    ],
    [
      22n,
      {
        id: 22n,
        serverId: SERVER,
        type: 1,
        parentId: null,
        permissionsSynced: false,
        deletedAt: null,
      },
    ],
  ]);
  const overwrites = [
    {
      channelId: 20n,
      targetId: SERVER,
      targetType: 0,
      allow: 0n,
      deny: P.CONNECT,
    },
    {
      channelId: 22n,
      targetId: SERVER,
      targetType: 0,
      allow: 0n,
      deny: P.SEND_MESSAGES,
    },
  ];
  const calls = { server: 0 };
  const repo = {
    channel: async (id: bigint) => channels.get(id),
    server: async (id: bigint, userId: bigint) => {
      calls.server++;
      if (id !== SERVER) return undefined;
      const member = facts.members.get(userId);
      return {
        ownerId: facts.ownerId,
        roles: facts.roles,
        member: member ?? null,
      };
    },
    overwrites: async (ids: bigint[]) =>
      overwrites.filter((o) => ids.includes(o.channelId)),
  } as unknown as PermissionsRepository;
  const clock = fixedClock(new Date('2026-10-18T14:47:00Z'));
  const cache = new PermissionCache(new MemoryKeyValueStore(clock));
  const service = new DbPermissionService(repo, cache, clock);
  return { service, cache, facts, channels, overwrites, calls, clock };
}

describe('DbPermissionService (REQ-ROLE-08)', () => {
  it('server level: @everyone OR the member’s roles; the Owner has everything (ROLE-02 AC2)', async () => {
    const { service } = world();
    expect(await service.permissionsIn(CHI, { serverId: SERVER })).toBe(
      DEFAULTS | P.MANAGE_STUDY_ROOMS,
    );
    expect(await service.permissionsIn(AN, { serverId: SERVER })).toBe(
      ALL_PERMISSIONS,
    );
  });

  it('ADMINISTRATOR passes every check (ROLE-02 AC1)', async () => {
    const { service, facts } = world();
    facts.roles[1]!.permissions = P.ADMINISTRATOR;
    expect(await service.can(CHI, { channelId: 22n }, P.SEND_MESSAGES)).toBe(
      true,
    );
  });

  it('a channel applies its own overwrites; a synced one its category’s', async () => {
    const { service } = world();
    expect(await service.can(DUNG, { channelId: 22n }, P.SEND_MESSAGES)).toBe(
      false,
    );
    expect(await service.can(DUNG, { channelId: 21n }, P.CONNECT)).toBe(false);
    expect(await service.can(DUNG, { channelId: 21n }, P.VIEW_CHANNEL)).toBe(
      true,
    );
  });

  it('nothing for a non-member, an unknown server, a deleted or missing channel', async () => {
    const { service, channels } = world();
    expect(await service.permissionsIn(99n, { serverId: SERVER })).toBe(0n);
    expect(await service.permissionsIn(AN, { serverId: 5n })).toBe(0n);
    expect(await service.permissionsIn(AN, { channelId: 404n })).toBe(0n);
    channels.get(22n)!.deletedAt = new Date();
    expect(await service.permissionsIn(AN, { channelId: 22n })).toBe(0n);
  });

  it('reads the cache until the server is invalidated (AC3)', async () => {
    const { service, cache, facts, calls } = world();
    await service.permissionsIn(CHI, { serverId: SERVER });
    facts.roles[1]!.permissions = 0n; // the role lost its permission in the DB
    expect(await service.permissionsIn(CHI, { serverId: SERVER })).toBe(
      DEFAULTS | P.MANAGE_STUDY_ROOMS,
    );
    expect(calls.server).toBe(1);
    await cache.invalidateServer(SERVER);
    expect(await service.permissionsIn(CHI, { serverId: SERVER })).toBe(
      DEFAULTS,
    );
  });

  it('caches per scope: a channel answer is not the server answer', async () => {
    const { service } = world();
    expect(await service.can(DUNG, { serverId: SERVER }, P.SEND_MESSAGES)).toBe(
      true,
    );
    expect(await service.can(DUNG, { channelId: 22n }, P.SEND_MESSAGES)).toBe(
      false,
    );
  });

  it('never caches a non-member, so joining counts at once', async () => {
    const { service, facts } = world();
    expect(await service.permissionsIn(7n, { serverId: SERVER })).toBe(0n);
    facts.members.set(7n, { roleIds: [], timeoutUntil: null });
    expect(await service.permissionsIn(7n, { serverId: SERVER })).toBe(
      DEFAULTS,
    );
  });

  it('a timeout ends on time: a timed-out member is not cached (CR-28 #17)', async () => {
    const { service, facts, clock } = world();
    facts.members.get(DUNG)!.timeoutUntil = new Date('2026-10-18T14:48:00Z');
    expect(await service.permissionsIn(DUNG, { serverId: SERVER })).toBe(
      P.VIEW_CHANNEL,
    );
    clock.advance(61);
    expect(await service.permissionsIn(DUNG, { serverId: SERVER })).toBe(
      DEFAULTS,
    );
  });
});
