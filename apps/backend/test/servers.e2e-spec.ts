import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import {
  DEFAULT_EVERYONE_PERMISSIONS,
  ErrorCode,
  GatewayRoutes,
  ServerRoutes,
  type ServerFrame,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import WebSocket from 'ws';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import {
  channels,
  roles,
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

const byId = (id: string) => ServerRoutes.byId.replace(':id', id);

// REQ-SRV-01 through REST, Postgres and READY. Needs `pnpm dev:infra`.
describe('Servers (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const events: { to: 'user' | 'server'; id: bigint; t: string }[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(EventPublisher).useValue({
        toUser: async (id: bigint, t: string) =>
          void events.push({ to: 'user', id, t }),
        toServer: async (id: bigint, t: string) =>
          void events.push({ to: 'server', id, t }),
        toChannel: async () => {},
      }),
    ));
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
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
    return {
      userId: BigInt(session.user.id),
      token: session.access_token,
      post: (path: string) => api.post(path).auth(session.access_token, auth),
      get: (path: string) => api.get(path).auth(session.access_token, auth),
      patch: (path: string) => api.patch(path).auth(session.access_token, auth),
    };
  };

  const createGeneral = async (
    me: Awaited<ReturnType<typeof signedIn>>,
    name = 'CLB Guitar PTIT',
  ) =>
    (
      await me
        .post(ServerRoutes.create)
        .send({ name, template: 'general' })
        .expect(201)
    ).body as ServerResponse;

  it('AC1 + AC4: template general, the creator is Owner and member, #general welcomes, SERVER_CREATE to the creator', async () => {
    const me = await signedIn();
    events.length = 0;
    const server = await createGeneral(me);
    const id = BigInt(server.id);

    const [row] = await db.select().from(servers).where(eq(servers.id, id));
    expect(row).toMatchObject({ ownerId: me.userId, template: 'general' });

    const chans = await db
      .select()
      .from(channels)
      .where(eq(channels.serverId, id));
    const category = chans.find((c) => c.type === 0)!;
    const text = chans.find((c) => c.type === 1)!;
    const voice = chans.find((c) => c.type === 2)!;
    expect(chans).toHaveLength(3);
    expect(category).toMatchObject({ name: 'Kênh chung', parentId: null });
    expect(text).toMatchObject({ name: 'general', parentId: category.id });
    expect(voice).toMatchObject({
      name: 'Phòng thoại chung',
      parentId: category.id,
      focusControl: 'off',
    });
    expect(row!.systemChannelId).toBe(text.id);

    expect(await db.select().from(roles).where(eq(roles.serverId, id))).toEqual(
      [
        expect.objectContaining({
          id,
          name: '@everyone',
          permissions: DEFAULT_EVERYONE_PERMISSIONS,
        }),
      ],
    );
    expect(
      await db
        .select({ userId: serverMembers.userId })
        .from(serverMembers)
        .where(eq(serverMembers.serverId, id)),
    ).toEqual([{ userId: me.userId }]);
    expect(events).toEqual([{ to: 'user', id: me.userId, t: 'SERVER_CREATE' }]);
    expect(server).toMatchObject({
      system_channel_id: text.id.toString(),
      member_count: 1,
    });
  });

  it('AC2: a 1-character name is 40001, on create and on rename', async () => {
    const me = await signedIn();
    const res = await me
      .post(ServerRoutes.create)
      .send({ name: 'A', template: 'general' })
      .expect(400);
    expect(res.body).toMatchObject({
      code: ErrorCode.ValidationError,
      errors: { name: [expect.anything()] },
    });
    const server = await createGeneral(me);
    await me.patch(byId(server.id)).send({ name: 'A' }).expect(400);
  });

  it('AC3: a user already in 100 servers gets 40011', async () => {
    const me = await signedIn();
    const ids = app.get(SnowflakeGenerator);
    const many = Array.from({ length: 100 }, () => ({
      id: ids.next(),
      name: 'Ôn thi',
      ownerId: me.userId,
    }));
    await db.insert(servers).values(many);
    await db
      .insert(serverMembers)
      .values(many.map((s) => ({ serverId: s.id, userId: me.userId })));

    const res = await me
      .post(ServerRoutes.create)
      .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.MaxServersReached);
  });

  it('AC5: a voice channel cannot welcome (40001); null = "Không gửi"; SERVER_UPDATE to the members', async () => {
    const me = await signedIn();
    const server = await createGeneral(me);
    const voice = server.channels.find((c) => c.type === 'voice')!;

    const res = await me
      .patch(byId(server.id))
      .send({ system_channel_id: voice.id })
      .expect(400);
    expect(res.body.errors).toHaveProperty('system_channel_id');

    events.length = 0;
    const updated = await me
      .patch(byId(server.id))
      .send({ system_channel_id: null })
      .expect(200);
    expect(updated.body).toMatchObject({ system_channel_id: null });
    expect(events).toEqual([
      { to: 'server', id: BigInt(server.id), t: 'SERVER_UPDATE' },
    ]);
  });

  it('template study_server is 40001 until P4-A2 (#168)', async () => {
    const me = await signedIn();
    const res = await me
      .post(ServerRoutes.create)
      .send({ name: 'Ôn thi Giải tích 2', template: 'study_server' })
      .expect(400);
    expect(res.body.errors).toHaveProperty('template');
  });

  it('GET /servers/:id: a member reads the full server, anyone else 40401', async () => {
    const me = await signedIn();
    const other = await signedIn();
    const server = await createGeneral(me);
    expect((await me.get(byId(server.id)).expect(200)).body).toEqual(server);
    const res = await other.get(byId(server.id)).expect(404);
    expect(res.body.code).toBe(ErrorCode.NotFound);
  });

  it('READY lists the servers of the user, oldest joined first', async () => {
    const me = await signedIn();
    const first = await createGeneral(me, 'CLB Guitar PTIT');
    const second = await createGeneral(me, 'Nhóm đồ án Mobile');

    const { port } = app.getHttpServer().address() as AddressInfo;
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}${GatewayRoutes.connect}?v=1&encoding=json`,
    );
    const ready = await new Promise<ServerFrame>((resolve) => {
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
                  device_id: 'd1',
                },
              },
            }),
          );
        if (frame.op === 0 && frame.t === 'READY') resolve(frame);
      });
    });
    ws.close();
    const listed = (ready.d as { servers: { id: string }[] }).servers;
    expect(listed.map((s) => s.id)).toEqual([first.id, second.id]);
  });
});
