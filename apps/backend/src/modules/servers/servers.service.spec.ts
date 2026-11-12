import { ErrorCode, Permission } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { fixedClock } from '../../common/clock.js';
import type { EventPublisher } from '../gateway/event-publisher.js';
import type { PermissionService } from '../permissions/permission.service.js';
import type { ServerRows } from './server-templates.js';
import type { FullServer, ServersRepository } from './servers.repository.js';
import type { AttachmentsService } from '../attachments/attachments.service.js';
import { ServersService } from './servers.service.js';

const AN = 1n;
const BINH = 2n;

// In-memory stand-in: just enough of the repository for the service rules.
function memoryRepo(atLimit = false) {
  const made: ServerRows[] = [];
  const members = new Map<bigint, Set<bigint>>();
  const full = (rows: ServerRows): FullServer => ({
    ...(rows.server as FullServer),
    systemChannelId: rows.server.systemChannelId ?? null,
    memberCount: members.get(rows.server.id!)!.size,
    channels: rows.channels.map((c) => ({
      permissionsSynced: true,
      ...c,
      overwrites: rows.overwrites.filter((o) => o.channelId === c.id),
    })) as FullServer['channels'],
    roles: rows.roles as FullServer['roles'],
    myRoleIds: rows.ownerRoleIds,
  });
  const find = (id: bigint) => made.find((r) => r.server.id === id);
  const repo = {
    made,
    create: async (rows: ServerRows) => {
      if (atLimit) return false;
      made.push(rows);
      members.set(rows.server.id!, new Set([rows.server.ownerId]));
      return true;
    },
    isMember: async (s: bigint, u: bigint) => !!members.get(s)?.has(u),
    findForMember: async (s: bigint, u: bigint) =>
      members.get(s)?.has(u) ? full(find(s)!) : undefined,
    summary: async (s: bigint) => full(find(s)!),
    findChannel: async (id: bigint) =>
      made
        .flatMap((r) => r.channels)
        .find((c) => c.id === id) as FullServer['channels'][number],
    update: async (s: bigint, patch: Record<string, unknown>) => {
      Object.assign(find(s)!.server, patch);
    },
    summariesForUser: async () => [],
  };
  return repo;
}

function setup(o: { atLimit?: boolean; allowed?: boolean } = {}) {
  const repo = memoryRepo(o.atLimit);
  const events: { to: string; id: bigint; t: string; d: unknown }[] = [];
  const asked: bigint[] = [];
  let next = 100n;
  const permissions = {
    can: async (_u: bigint, _s: unknown, p: bigint) => {
      asked.push(p);
      return o.allowed ?? true;
    },
    require: async (_u: bigint, _s: unknown, p: bigint) => {
      asked.push(p);
      if (!(o.allowed ?? true))
        throw new AppError(ErrorCode.Forbidden, 'missing permission');
    },
  } as unknown as PermissionService;
  const service = new ServersService(
    repo as unknown as ServersRepository,
    { next: () => next++ } as never,
    fixedClock(new Date('2026-10-18T13:12:00Z')),
    {
      toUser: async (id: bigint, t: string, d: unknown) =>
        void events.push({ to: 'user', id, t, d }),
      toServer: async (id: bigint, t: string, d: unknown) =>
        void events.push({ to: 'server', id, t, d }),
    } as unknown as EventPublisher,
    permissions,
    { usable: async () => undefined } as unknown as AttachmentsService,
  );
  return { service, repo, events, asked };
}

const rejectsWith = async (p: Promise<unknown>, code: number) => {
  const err = await p.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
  return err as AppError;
};

const create = { name: 'CLB Guitar PTIT', template: 'general' } as const;

describe('ServersService.create (REQ-SRV-01)', () => {
  it('creates the server and sends SERVER_CREATE to every session of the creator', async () => {
    const { service, events } = setup();
    const server = await service.create(AN, create);
    expect(server).toMatchObject({
      name: 'CLB Guitar PTIT',
      owner_id: '1',
      member_count: 1,
    });
    expect(server.channels.map((c) => c.name)).toEqual([
      'Kênh chung',
      'general',
      'Phòng thoại chung',
    ]);
    expect(events).toEqual([
      { to: 'user', id: AN, t: 'SERVER_CREATE', d: server },
    ]);
  });

  it('AC3: a user already in 100 servers gets 40011', async () => {
    const { service, events } = setup({ atLimit: true });
    await rejectsWith(service.create(AN, create), ErrorCode.MaxServersReached);
    expect(events).toEqual([]);
  });

  it('template study_server is not open through the API yet: 40001 on template', async () => {
    const { service, repo } = setup();
    const err = await rejectsWith(
      service.create(AN, { ...create, template: 'study_server' }),
      ErrorCode.ValidationError,
    );
    expect(Object.keys(err.errors!)).toEqual(['template']);
    expect(repo.made).toEqual([]);
  });
});

describe('ServersService.update (REQ-SRV-01 AC5)', () => {
  const made = async (s: ReturnType<typeof setup>) => {
    const server = await s.service.create(AN, create);
    s.events.length = 0;
    const byName = (n: string) => server.channels.find((c) => c.name === n)!.id;
    return { id: BigInt(server.id), byName };
  };

  it('a voice channel cannot welcome: 40001 on system_channel_id', async () => {
    const s = setup();
    const { id, byName } = await made(s);
    const err = await rejectsWith(
      s.service.update(AN, id, {
        system_channel_id: byName('Phòng thoại chung'),
      }),
      ErrorCode.ValidationError,
    );
    expect(Object.keys(err.errors!)).toEqual(['system_channel_id']);
  });

  it('a channel of another server cannot welcome either', async () => {
    const s = setup();
    const { id } = await made(s);
    const other = await s.service.create(BINH, {
      name: 'Nhóm đồ án Mobile',
      template: 'general',
    });
    await rejectsWith(
      s.service.update(AN, id, {
        system_channel_id: other.channels.find((c) => c.type === 'text')!.id,
      }),
      ErrorCode.ValidationError,
    );
  });

  it('null = "Không gửi"; renames; SERVER_UPDATE goes to the members', async () => {
    const s = setup();
    const { id } = await made(s);
    const updated = await s.service.update(AN, id, {
      name: 'CLB Guitar',
      system_channel_id: null,
    });
    expect(updated).toMatchObject({
      name: 'CLB Guitar',
      system_channel_id: null,
    });
    expect(s.events).toEqual([
      { to: 'server', id, t: 'SERVER_UPDATE', d: updated },
    ]);
  });

  it('needs MANAGE_SERVER through PermissionService (40302)', async () => {
    const s = setup({ allowed: false });
    const { id } = await made(s);
    await rejectsWith(
      s.service.update(AN, id, { name: 'CLB Guitar' }),
      ErrorCode.Forbidden,
    );
    expect(s.asked).toContain(Permission.MANAGE_SERVER);
  });

  it('a server the caller is not in is 40401', async () => {
    const s = setup();
    const { id } = await made(s);
    await rejectsWith(
      s.service.update(BINH, id, { name: 'CLB Guitar' }),
      ErrorCode.NotFound,
    );
  });
});

describe('ServersService.get', () => {
  it('a member sees the channels they may view; others get 40401', async () => {
    const s = setup();
    const server = await s.service.create(AN, create);
    s.asked.length = 0;
    await expect(s.service.get(AN, BigInt(server.id))).resolves.toEqual(server);
    expect(s.asked).toEqual(server.channels.map(() => Permission.VIEW_CHANNEL));
    await rejectsWith(
      s.service.get(BINH, BigInt(server.id)),
      ErrorCode.NotFound,
    );
  });
});
