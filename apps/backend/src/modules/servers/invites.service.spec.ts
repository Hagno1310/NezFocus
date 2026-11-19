import { ErrorCode, Permission } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { fixedClock } from '../../common/clock.js';
import { MemoryKeyValueStore } from '../../redis/key-value-store.js';
import type { EventPublisher } from '../gateway/event-publisher.js';
import type { PresenceReader } from '../gateway/presence.service.js';
import type { PermissionService } from '../permissions/permission.service.js';
import type {
  AcceptResult,
  InvitesRepository,
  PreviewData,
} from './invites.repository.js';
import { InvitesService } from './invites.service.js';
import type { ServersService } from './servers.service.js';
import { ChannelTypeCode, type InviteRow } from './servers.schema.js';

const AN = 1n;
const BINH = 2n;
const CHI = 3n;
const SERVER = 10n;
const CHAO_MUNG = 11n;
const ROOM = 12n;
const NOW = new Date('2026-10-18T13:12:00Z');
const IP = '10.0.0.7';
const DAY = 86_400;

const invite = (o: Partial<InviteRow> = {}): InviteRow => ({
  code: 'k7Qm2xPa',
  serverId: SERVER,
  channelId: CHAO_MUNG,
  creatorId: AN,
  maxUses: 0,
  uses: 0,
  expiresAt: new Date(NOW.getTime() + 7 * DAY * 1000),
  revokedAt: null,
  createdAt: NOW,
  ...o,
});

// In-memory stand-in for the repository: the invite rules live in the service, the
// transaction (lock, ban, membership, 100 servers) in the repository's accept.
function setup(
  o: {
    allowed?: boolean;
    members?: bigint[];
    online?: number;
    accept?: AcceptResult;
  } = {},
) {
  const clock = fixedClock(NOW);
  const rows = new Map<string, InviteRow>();
  const members = new Set(o.members ?? [AN, BINH]);
  let nextCode = 0;
  const repo = {
    rows,
    find: async (code: string) => rows.get(code),
    ownInvites: async (creatorId: bigint, channelId: bigint) =>
      [...rows.values()].filter(
        (r) => r.creatorId === creatorId && r.channelId === channelId,
      ),
    insert: async (row: InviteRow) => {
      if (rows.has(row.code)) return false;
      rows.set(row.code, row);
      return true;
    },
    revoke: async (code: string, at: Date) => {
      rows.get(code)!.revokedAt = at;
    },
    channel: async (id: bigint) =>
      id === CHAO_MUNG || id === ROOM
        ? {
            id,
            serverId: SERVER,
            name: id === ROOM ? 'Phòng học im lặng' : 'chao-mung',
            type: id === ROOM ? ChannelTypeCode.voice : ChannelTypeCode.text,
          }
        : undefined,
    isMember: async (_s: bigint, u: bigint) => members.has(u),
    preview: async (row: InviteRow): Promise<PreviewData> => ({
      server: {
        id: SERVER,
        name: 'Ôn thi Giải tích 2',
        iconKey: null,
      },
      memberIds: [...members],
      creator:
        row.creatorId === AN
          ? {
              displayName: 'An',
              username: 'an.nguyen',
              avatarKey: null,
              active: true,
              member: members.has(AN),
            }
          : null,
    }),
    accept: async (code: string, userId: bigint): Promise<AcceptResult> => {
      const result = o.accept ?? 'joined';
      if (result === 'joined') {
        members.add(userId);
        rows.get(code)!.uses++;
      }
      return result;
    },
    liveForServer: async () => [],
    user: async (id: bigint) => ({
      id,
      username: 'chi.pham',
      displayName: 'Chi',
      avatarKey: null,
    }),
  };
  const events: { to: string; id: bigint; t: string; d: unknown }[] = [];
  const asked: { scope: unknown; p: bigint }[] = [];
  const permissions = {
    require: async (_u: bigint, scope: unknown, p: bigint) => {
      asked.push({ scope, p });
      if (!(o.allowed ?? true))
        throw new AppError(ErrorCode.Forbidden, 'missing permission');
    },
  } as unknown as PermissionService;
  const service = new InvitesService(
    repo as unknown as InvitesRepository,
    {
      get: async (_u: bigint, id: bigint) => ({ id: id.toString() }),
    } as unknown as ServersService,
    permissions,
    {
      toUser: async (id: bigint, t: string, d: unknown) =>
        void events.push({ to: 'user', id, t, d }),
      toServer: async (id: bigint, t: string, d: unknown) =>
        void events.push({ to: 'server', id, t, d }),
    } as unknown as EventPublisher,
    { onlineCount: () => o.online ?? 0 } as unknown as PresenceReader,
    new MemoryKeyValueStore(clock),
    clock,
    { next: () => `code${String(nextCode++).padStart(4, '0')}` },
  );
  return { service, repo, events, asked, clock, members };
}

const rejectsWith = async (p: Promise<unknown>, code: number) => {
  const err = await p.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
  return err as AppError;
};

describe('REQ-SRV-03 create', () => {
  it('makes an 8-character code with the default 7 days, unlimited uses', async () => {
    const { service } = setup();
    const { invite: made, created } = await service.create(AN, CHAO_MUNG, {});
    expect(created).toBe(true);
    expect(made.code).toBe('code0000');
    expect(made).toMatchObject({
      max_age: 7 * DAY,
      max_uses: 0,
      uses: 0,
      channel_id: CHAO_MUNG.toString(),
      expires_at: '2026-10-25T13:12:00.000Z',
    });
  });

  it('never expires with max_age 0', async () => {
    const { service } = setup();
    const { invite: made } = await service.create(AN, CHAO_MUNG, {
      max_age: 0,
      max_uses: 10,
    });
    expect(made).toMatchObject({ max_age: 0, max_uses: 10, expires_at: null });
  });

  it('needs CREATE_INVITE in the channel (40302)', async () => {
    const { service, asked } = setup({ allowed: false });
    await rejectsWith(service.create(AN, CHAO_MUNG, {}), 40302);
    expect(asked).toEqual([
      { scope: { channelId: CHAO_MUNG }, p: Permission.CREATE_INVITE },
    ]);
  });

  it('hides a channel from a non-member (40401)', async () => {
    const { service } = setup({ members: [BINH] });
    await rejectsWith(service.create(AN, CHAO_MUNG, {}), 40401);
  });

  it('v1.5: gives back my own live invite with the same settings', async () => {
    const { service, clock } = setup();
    const first = await service.create(AN, CHAO_MUNG, {});
    clock.advance(DAY);
    const again = await service.create(AN, CHAO_MUNG, {});
    expect(again.created).toBe(false);
    expect(again.invite.code).toBe(first.invite.code);
  });

  it('v1.5: makes a new one when the settings differ or mine is used up', async () => {
    const { service, repo } = setup();
    const first = await service.create(AN, CHAO_MUNG, { max_uses: 5 });
    const other = await service.create(AN, CHAO_MUNG, { max_uses: 10 });
    expect(other.invite.code).not.toBe(first.invite.code);
    repo.rows.get(first.invite.code)!.uses = 5;
    const fresh = await service.create(AN, CHAO_MUNG, { max_uses: 5 });
    expect(fresh.invite.code).not.toBe(first.invite.code);
  });

  it('draws another code when one is taken', async () => {
    const { service, repo } = setup();
    repo.rows.set('code0000', invite({ code: 'code0000', creatorId: CHI }));
    const { invite: made } = await service.create(AN, CHAO_MUNG, {});
    expect(made.code).toBe('code0001');
  });
});

describe('REQ-SRV-04 preview', () => {
  it('shows the server, counts and who invited', async () => {
    const { service, repo } = setup({ online: 1 });
    repo.rows.set('k7Qm2xPa', invite());
    const preview = await service.preview('k7Qm2xPa', IP);
    expect(preview).toEqual({
      code: 'k7Qm2xPa',
      server: {
        id: SERVER.toString(),
        name: 'Ôn thi Giải tích 2',
        icon_url: null,
        member_count: 2,
        online_count: 1,
      },
      inviter: { display_name: 'An', avatar: null },
      channel: null,
    });
  });

  it('AC4: inviter is null once the creator left, and the invite still works', async () => {
    const { service, repo } = setup({ members: [BINH] });
    repo.rows.set('k7Qm2xPa', invite());
    expect((await service.preview('k7Qm2xPa', IP)).inviter).toBeNull();
  });

  it('names the room of a room invite (SRV-07 v1.6)', async () => {
    const { service, repo } = setup();
    repo.rows.set('k7Qm2xPa', invite({ channelId: ROOM }));
    expect((await service.preview('k7Qm2xPa', IP)).channel).toEqual({
      id: ROOM.toString(),
      name: 'Phòng học im lặng',
    });
  });

  it('SRV-03 AC2: an expired invite is 40041, with nothing about the server', async () => {
    const { service, repo } = setup();
    repo.rows.set('k7Qm2xPa', invite({ expiresAt: NOW }));
    await rejectsWith(service.preview('k7Qm2xPa', IP), 40041);
  });

  it('SRV-03 AC3: more than 30 unknown codes a minute from one IP → 40029', async () => {
    const { service, repo, clock } = setup();
    repo.rows.set('k7Qm2xPa', invite());
    for (let i = 0; i < 30; i++)
      await rejectsWith(service.preview(`unknown${i}`, IP), 40041);
    const err = await rejectsWith(service.preview('unknownX', IP), 40029);
    expect(err.details.retryAfter).toBeGreaterThan(0);
    // The IP is held back for real codes too until the minute is over.
    await rejectsWith(service.preview('k7Qm2xPa', IP), 40029);
    await expect(
      service.preview('k7Qm2xPa', '10.0.0.8'),
    ).resolves.toBeDefined();
    clock.advance(61);
    await expect(service.preview('k7Qm2xPa', IP)).resolves.toBeDefined();
  });

  it('SRV-03 AC3: expired or revoked codes are not counted as unknown', async () => {
    const { service, repo } = setup();
    repo.rows.set('k7Qm2xPa', invite({ revokedAt: NOW }));
    for (let i = 0; i < 31; i++)
      await rejectsWith(service.preview('k7Qm2xPa', IP), 40041);
  });
});

describe('REQ-SRV-04 accept', () => {
  it('AC1: joins, then SERVER_CREATE to me and SERVER_MEMBER_ADD to the members', async () => {
    const { service, repo, events } = setup();
    repo.rows.set('k7Qm2xPa', invite());
    const server = await service.accept(CHI, 'k7Qm2xPa', IP);
    expect(server).toEqual({ id: SERVER.toString() });
    expect(repo.rows.get('k7Qm2xPa')!.uses).toBe(1);
    expect(events.map((e) => [e.to, e.id, e.t])).toEqual([
      ['user', CHI, 'SERVER_CREATE'],
      ['server', SERVER, 'SERVER_MEMBER_ADD'],
    ]);
    expect(events[1]!.d).toMatchObject({
      server_id: SERVER.toString(),
      user: { id: CHI.toString() },
      role_ids: [],
    });
  });

  it('AC3: already a member → the server, no event', async () => {
    const { service, repo, events } = setup({ accept: 'member' });
    repo.rows.set('k7Qm2xPa', invite());
    expect(await service.accept(BINH, 'k7Qm2xPa', IP)).toEqual({
      id: SERVER.toString(),
    });
    expect(events).toEqual([]);
  });

  it.each([
    ['invalid', 40041],
    ['banned', 40306],
    ['max-servers', 40011],
  ] as const)('%s → %i', async (result, code) => {
    const { service, repo, events } = setup({ accept: result });
    repo.rows.set('k7Qm2xPa', invite());
    await rejectsWith(service.accept(CHI, 'k7Qm2xPa', IP), code);
    expect(events).toEqual([]);
  });

  it('an unknown code counts toward the guessing limit', async () => {
    const { service } = setup();
    for (let i = 0; i < 30; i++)
      await rejectsWith(service.accept(CHI, `unknown${i}`, IP), 40041);
    await rejectsWith(service.accept(CHI, 'unknownX', IP), 40029);
  });
});

describe('REQ-SRV-03 revoke', () => {
  it('AC4: the creator revokes their link, which then answers 40041', async () => {
    const { service, repo } = setup();
    repo.rows.set('k7Qm2xPa', invite());
    await service.revoke(AN, 'k7Qm2xPa');
    await rejectsWith(service.preview('k7Qm2xPa', IP), 40041);
  });

  it('AC5: a member who is not the creator needs MANAGE_SERVER (40302)', async () => {
    const { service, repo, asked } = setup({ allowed: false });
    repo.rows.set('k7Qm2xPa', invite());
    await rejectsWith(service.revoke(BINH, 'k7Qm2xPa'), 40302);
    expect(asked).toEqual([
      { scope: { serverId: SERVER }, p: Permission.MANAGE_SERVER },
    ]);
    expect(repo.rows.get('k7Qm2xPa')!.revokedAt).toBeNull();
  });

  it('a non-member is refused (40302)', async () => {
    const { service, repo } = setup({ members: [AN] });
    repo.rows.set('k7Qm2xPa', invite());
    await rejectsWith(service.revoke(CHI, 'k7Qm2xPa'), 40302);
  });

  it('an unknown code is 40041', async () => {
    const { service } = setup();
    await rejectsWith(service.revoke(AN, 'nothere1'), 40041);
  });
});

describe('REQ-SRV-03 v1.7 list', () => {
  it('needs MANAGE_SERVER (40302)', async () => {
    const { service } = setup({ allowed: false });
    await rejectsWith(service.listForServer(AN, SERVER), 40302);
  });

  it('is 40401 for a non-member', async () => {
    const { service } = setup({ members: [BINH] });
    await rejectsWith(service.listForServer(AN, SERVER), 40401);
  });
});
