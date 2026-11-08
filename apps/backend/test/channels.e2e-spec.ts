import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  GatewayRoutes,
  Permission,
  ServerRoutes,
  type ChannelResponse,
  type ServerFrame,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import WebSocket from 'ws';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import {
  PermissionService,
  type PermissionScope,
} from '../src/modules/permissions/permission.service.js';
import { buildServer } from '../src/modules/servers/server-templates.js';
import { ServersRepository } from '../src/modules/servers/servers.repository.js';
import {
  channels,
  serverMembers,
  servers,
} from '../src/modules/servers/servers.schema.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const list = (serverId: string) => ChannelRoutes.list.replace(':id', serverId);
const positions = (serverId: string) =>
  ChannelRoutes.positions.replace(':id', serverId);
const byId = (channelId: string) =>
  ChannelRoutes.byId.replace(':id', channelId);

// The real check lands in P1-A3.2 (#65); until then a test says what is refused.
class SwitchablePermissions extends PermissionService {
  deny: (userId: bigint, scope: PermissionScope, bit: bigint) => boolean = () =>
    false;
  async can(userId: bigint, scope: PermissionScope, bit: bigint) {
    return !this.deny(userId, scope, bit);
  }
}

// REQ-SRV-02 through REST, Postgres and the Gateway. Needs `pnpm dev:infra`.
describe('Channels (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const permissions = new SwitchablePermissions();

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(PermissionService).useValue(permissions),
    ));
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    permissions.deny = () => false;
  });

  const signedIn = async () => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    const auth = { type: 'bearer' as const };
    const api = http(app);
    const token = session.access_token;
    return {
      userId: BigInt(session.user.id),
      token,
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      patch: (path: string) => api.patch(path).auth(token, auth),
      delete: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const createGeneral = async (me: Me) =>
    (
      await me
        .post(ServerRoutes.create)
        .send({ name: 'CLB Guitar PTIT', template: 'general' })
        .expect(201)
    ).body as ServerResponse;

  // Study Server comes from the seed path: the API opens that template in P4-A2 (#168).
  const createStudyServer = async (me: Me) => {
    const ids = app.get(SnowflakeGenerator);
    const rows = buildServer('study_server', {
      name: 'Ôn thi Giải tích 2',
      ownerId: me.userId,
      now: new Date(),
      nextId: () => ids.next(),
    });
    await app.get(ServersRepository).create(rows, 100);
    return rows.server.id!.toString();
  };

  const join = (serverId: string, who: Me) =>
    db
      .insert(serverMembers)
      .values({ serverId: BigInt(serverId), userId: who.userId });

  const channelsOf = async (me: Me, serverId: string) =>
    (await me.get(list(serverId)).expect(200)).body as ChannelResponse[];

  const create = (me: Me, serverId: string, body: object) =>
    me.post(list(serverId)).send(body);

  // A signed-in Gateway session that keeps every DISPATCH it gets.
  const connect = async (me: Me) => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}${GatewayRoutes.connect}?v=1&encoding=json`,
    );
    const dispatches: { t: string; d: unknown; at: number }[] = [];
    const waiters: (() => void)[] = [];
    await new Promise<void>((ready) => {
      ws.on('message', (data) => {
        const frame = JSON.parse(data.toString()) as ServerFrame;
        if (frame.op === 10)
          ws.send(
            JSON.stringify({
              op: 2,
              d: {
                token: me.token,
                device: {
                  platform: 'android',
                  app_version: '0.1.0',
                  device_id: 'd2',
                },
              },
            }),
          );
        if (frame.op !== 0) return;
        if (frame.t === 'READY') return ready();
        dispatches.push({ t: frame.t, d: frame.d, at: Date.now() });
        waiters.splice(0).forEach((w) => w());
      });
    });
    const next = (t: string) =>
      new Promise<{ d: unknown; at: number }>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no ${t}`)), 3000);
        const look = () => {
          const hit = dispatches.find((x) => x.t === t);
          if (!hit) return void waiters.push(look);
          clearTimeout(timer);
          resolve(hit);
        };
        look();
      });
    return { dispatches, next, close: () => ws.close() };
  };

  it('AC1: a move persists and CHANNEL_UPDATE reaches an online member within 1 second', async () => {
    const owner = await signedIn();
    const member = await signedIn();
    const server = await createGeneral(owner);
    await join(server.id, member);
    const voice = server.channels.find((c) => c.type === 'voice')!;
    const gateway = await connect(member);

    const sent = Date.now();
    await owner
      .patch(positions(server.id))
      .send([{ id: voice.id, position: 0, parent_id: null }])
      .expect(204);
    const update = await gateway.next('CHANNEL_UPDATE');
    gateway.close();

    expect(update.at - sent).toBeLessThanOrEqual(1000);
    expect(update.d).toMatchObject({
      id: voice.id,
      parent_id: null,
      position: 0,
      permissions_synced: false, // out of its category (REQ-ROLE-03 v1.8)
    });
    const moved = (await channelsOf(member, server.id)).find(
      (c) => c.id === voice.id,
    );
    expect(moved).toMatchObject({ parent_id: null, position: 0 });
  });

  it('AC2 + AC3: "Hỏi Đáp Chung" is saved as hỏi-đáp-chung; a voice name stays as typed; no category is fine', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const text = await create(me, server.id, {
      type: 'text',
      name: 'Hỏi Đáp Chung',
    }).expect(201);
    expect(text.body).toMatchObject({ name: 'hỏi-đáp-chung', parent_id: null });
    const voice = await create(me, server.id, {
      type: 'voice',
      name: 'Phòng học im lặng',
    }).expect(201);
    expect(voice.body).toMatchObject({ name: 'Phòng học im lặng' });
  });

  it('AC4: without MANAGE_CHANNELS every change is 40302', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const text = server.channels.find((c) => c.type === 'text')!;
    permissions.deny = (_u, _s, bit) => bit === Permission.MANAGE_CHANNELS;

    const refused = [
      await create(me, server.id, { type: 'text', name: 'tai-lieu' }),
      await me.patch(byId(text.id)).send({ name: 'chung' }),
      await me
        .patch(positions(server.id))
        .send([{ id: text.id, position: 3, parent_id: text.parent_id }]),
      await me.delete(byId(text.id)),
    ];
    expect(refused.map((r) => [r.status, r.body.code])).toEqual(
      Array(4).fill([403, ErrorCode.Forbidden]),
    );
  });

  it('AC5: deleting a category moves its channels to the top group, after the channels there', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const category = server.channels.find((c) => c.type === 'category')!;
    const top = await create(me, server.id, {
      type: 'text',
      name: 'thong-bao',
    }).expect(201);

    await me.delete(byId(category.id)).expect(204);
    const after = await channelsOf(me, server.id);
    expect(after.find((c) => c.id === category.id)).toBeUndefined();
    expect(
      after.map((c) => [c.name, c.parent_id, c.position, c.permissions_synced]),
    ).toEqual([
      ['thong-bao', null, 0, false],
      ['general', null, 1, false],
      ['Phòng thoại chung', null, 2, false],
    ]);
    expect(top.body.position).toBe(0);
  });

  it('AC6: an unsent focus_control is off in a general server, everyone in a Study Server; off is kept', async () => {
    const me = await signedIn();
    const general = await createGeneral(me);
    const study = await createStudyServer(me);
    const voice = (serverId: string, extra = {}) =>
      create(me, serverId, {
        type: 'voice',
        name: 'Phòng ôn tối',
        ...extra,
      }).expect(201);

    expect((await voice(general.id)).body.focus_control).toBe('off');
    expect((await voice(study)).body.focus_control).toBe('everyone');
    const off = await create(me, study, {
      type: 'voice',
      name: 'Phòng tán gẫu',
      focus_control: 'off',
    }).expect(201);
    expect(off.body.focus_control).toBe('off');
  });

  it('AC7 + names: duplicates are 40001 on name, with the sentences of SRV-02', async () => {
    const me = await signedIn();
    const study = await createStudyServer(me);
    const rooms = (await channelsOf(me, study)).find(
      (c) => c.name === 'PHÒNG HỌC',
    )!;
    await create(me, study, {
      type: 'voice',
      name: 'Phòng Ôn',
      parent_id: rooms.id,
    }).expect(201);

    const clash = await create(me, study, {
      type: 'voice',
      name: 'phòng ôn',
      parent_id: rooms.id,
    }).expect(400);
    expect(clash.body).toMatchObject({
      code: ErrorCode.ValidationError,
      errors: {
        name: [
          { code: 'DUPLICATE_NAME', message: 'PHÒNG HỌC đã có phòng Phòng Ôn' },
        ],
      },
    });
    const category = await create(me, study, {
      type: 'category',
      name: 'Thông tin',
    }).expect(400);
    expect(category.body.errors.name[0].message).toBe(
      'Server đã có danh mục THÔNG TIN',
    );

    // Renaming and moving follow the same rule.
    const top = await create(me, study, {
      type: 'text',
      name: 'tai-lieu',
    }).expect(201);
    const info = (await channelsOf(me, study)).find(
      (c) => c.name === 'THÔNG TIN',
    )!;
    const moved = await me
      .patch(positions(study))
      .send([{ id: top.body.id, position: 9, parent_id: info.id }])
      .expect(400);
    expect(moved.body.errors.name[0].message).toBe(
      'THÔNG TIN đã có kênh #tai-lieu',
    );
    const other = await create(me, study, {
      type: 'text',
      name: 'ghi-chu',
    }).expect(201);
    const renamed = await me
      .patch(byId(other.body.id))
      .send({ name: 'Tai Lieu' })
      .expect(400);
    expect(renamed.body.errors.name[0].message).toBe(
      'Trên cùng danh sách đã có kênh #tai-lieu',
    );
  });

  it('AC8: hỏi-đáp next to hoi-dap is fine (accents count)', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    await create(me, server.id, { type: 'text', name: 'hoi-dap' }).expect(201);
    await create(me, server.id, { type: 'text', name: 'hỏi-đáp' }).expect(201);
  });

  it('AC9: "???" is 40001 "Tên kênh cần ít nhất một chữ cái hoặc chữ số", on create and on rename', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const text = server.channels.find((c) => c.type === 'text')!;
    const expected = {
      code: ErrorCode.ValidationError,
      errors: {
        name: [
          {
            code: 'NO_LETTER_OR_DIGIT',
            message: 'Tên kênh cần ít nhất một chữ cái hoặc chữ số',
          },
        ],
      },
    };
    const created = await create(me, server.id, { type: 'text', name: '???' });
    expect(created.body).toMatchObject(expected);
    const renamed = await me.patch(byId(text.id)).send({ name: '???' });
    expect(renamed.body).toMatchObject(expected);
  });

  it('deleting the kênh tin chào mừng is a soft-delete that sets it to "Không gửi"; the channel is then 40401', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const welcome = server.system_channel_id!;

    await me.delete(byId(welcome)).expect(204);
    const [row] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, BigInt(welcome)));
    expect(row!.deletedAt).toBeInstanceOf(Date);
    const [owner] = await db
      .select()
      .from(servers)
      .where(eq(servers.id, BigInt(server.id)));
    expect(owner!.systemChannelId).toBeNull();
    expect((await channelsOf(me, server.id)).map((c) => c.id)).not.toContain(
      welcome,
    );
    await me.patch(byId(welcome)).send({ name: 'chung' }).expect(404);
  });

  it('GET lists only what the caller may view; a non-member gets 40401', async () => {
    const me = await signedIn();
    const stranger = await signedIn();
    const server = await createGeneral(me);
    const voice = server.channels.find((c) => c.type === 'voice')!;
    permissions.deny = (_u, scope, bit) =>
      bit === Permission.VIEW_CHANNEL &&
      'channelId' in scope &&
      scope.channelId === BigInt(voice.id);

    expect((await channelsOf(me, server.id)).map((c) => c.id)).not.toContain(
      voice.id,
    );
    const res = await stranger.get(list(server.id)).expect(404);
    expect(res.body.code).toBe(ErrorCode.NotFound);
  });

  it('a category cannot sit in a category; the parent must be a category of this server', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const [category, text] = ['category', 'text'].map((t) =>
      server.channels.find((c) => c.type === t)!,
    );
    const res = await create(me, server.id, {
      type: 'text',
      name: 'tai-lieu',
      parent_id: text!.id,
    }).expect(400);
    expect(res.body.errors).toHaveProperty('parent_id');
    const nested = await create(me, server.id, {
      type: 'category',
      name: 'Khác',
    }).expect(201);
    await me
      .patch(positions(server.id))
      .send([{ id: nested.body.id, position: 0, parent_id: category!.id }])
      .expect(400);
  });
});
