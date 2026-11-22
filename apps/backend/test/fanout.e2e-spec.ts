import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  MessageRoutes,
  Permission as P,
  ServerRoutes,
  type MessageCreateEvent,
  type ServerResponse,
} from '@nezfocus/shared';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import type { Redis } from 'ioredis';
import { DB, type Db } from '../src/db/db.module.js';
import { REDIS } from '../src/redis/redis.module.js';
import { serverMembers } from '../src/modules/servers/servers.schema.js';
import { users } from '../src/modules/users/users.schema.js';
import {
  CapturingMailer,
  completion,
  connectGateway,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

type Gateway = Awaited<ReturnType<typeof connectGateway>>;

const isMessage = (id: string) => (d: unknown) =>
  (d as MessageCreateEvent).id === id;

// REQ-MSG-07 with Postgres, Redis Pub/Sub and real WebSockets. Needs `pnpm dev:infra`.
describe('Selective fanout (e2e)', () => {
  let app: INestApplication;
  let other: INestApplication; // a second Gateway instance on the same Redis
  let mailer: CapturingMailer;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    ({ app: other } = await createTestApp());
    await other.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await other.close();
    await app.close();
  });

  const signedIn = async (complete = false) => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const token = session.access_token;
    if (complete)
      await http(app)
        .post('/auth/complete-account')
        .auth(token, { type: 'bearer' })
        .send(completion(uniqueUsername()))
        .expect(200);
    return { id: session.user.id, userId: BigInt(session.user.id), token };
  };
  const as = (token: string) => {
    const api = http(app);
    const auth = { type: 'bearer' as const };
    return {
      post: (p: string) => api.post(p).auth(token, auth),
      put: (p: string) => api.put(p).auth(token, auth),
      patch: (p: string) => api.patch(p).auth(token, auth),
    };
  };

  // An's server, #general unsynced so member overwrites apply to it alone.
  const serverOf = async (anToken: string, memberIds: bigint[]) => {
    const an = as(anToken);
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db
      .insert(serverMembers)
      .values(
        memberIds.map((userId) => ({ serverId: BigInt(server.id), userId })),
      );
    const text = server.channels.find((c) => c.type === 'text')!;
    await an
      .patch(ChannelRoutes.byId.replace(':id', text.id))
      .send({ permissions_synced: false })
      .expect(200);
    const hideFrom = (userId: string) =>
      an
        .put(
          ChannelRoutes.permission
            .replace(':id', text.id)
            .replace(':targetId', userId),
        )
        .send({
          target_type: 'member',
          allow: '0',
          deny: P.VIEW_CHANNEL.toString(),
        })
        .expect(200);
    // REQ-MSG-08 is not what this measures: open the rate-limit windows before each message.
    const send = async (content: string) =>
      (await clearRateLimit(),
      await an
        .post(MessageRoutes.list.replace(':id', text.id))
        .send({ content, nonce: randomUUID() })
        .expect(201)).body as { id: string };
    return { id: server.id, channelId: text.id, hideFrom, send };
  };

  const settle = () => new Promise((r) => setTimeout(r, 300));
  const clearRateLimit = async () => {
    const redis = app.get<Redis>(REDIS);
    const keys = await redis.keys('msg-rate:*');
    if (keys.length) await redis.del(...keys);
  };
  const got = (g: Gateway, messageId: string) =>
    g.dispatches.some(
      (x) => x.t === 'MESSAGE_CREATE' && isMessage(messageId)(x.d),
    );

  it('MSG-07 AC1: 100 members, 20 online, 5 without VIEW_CHANNEL → only 15 get MESSAGE_CREATE', async () => {
    const an = await signedIn(true);
    const online = await Promise.all(
      Array.from({ length: 20 }, () => signedIn()),
    );
    const ids = app.get(SnowflakeGenerator);
    const offline = Array.from({ length: 79 }, () => ids.next());
    await db.insert(users).values(offline.map((id) => ({ id })));
    const server = await serverOf(an.token, [
      ...online.map((u) => u.userId),
      ...offline,
    ]);
    const hidden = online.slice(0, 5);
    for (const u of hidden) await server.hideFrom(u.id);

    const gateways = await Promise.all(
      online.map((u) => connectGateway(app, u.token)),
    );

    // NFR-PERF-01: REST 201 → client, measured over every receiver of 10 messages.
    const delays: number[] = [];
    let last = '';
    for (let i = 0; i < 10; i++) {
      const sentAt = Date.now();
      last = (await server.send(`Tin ${i}`)).id;
      const arrivals = await Promise.all(
        gateways.slice(5).map((g) => g.next('MESSAGE_CREATE', isMessage(last))),
      );
      delays.push(...arrivals.map((a) => a.at - sentAt));
    }
    await settle();
    expect(gateways.filter((g) => got(g, last))).toHaveLength(15);
    expect(
      gateways
        .slice(0, 5)
        .some((g) => g.dispatches.some((x) => x.t === 'MESSAGE_CREATE')),
    ).toBe(false);

    delays.sort((a, b) => a - b);
    const p95 = delays[Math.ceil(delays.length * 0.95) - 1]!;
    console.log(
      `MESSAGE_CREATE REST 201 → client: P95 ${p95} ms, max ${delays.at(-1)} ms (n=${delays.length})`,
    );
    expect(p95).toBeLessThan(300);

    gateways.forEach((g) => g.close());
  }, 60_000);

  it('a member who loses VIEW_CHANNEL stops getting the channel from the next message (ROLE-08 AC3)', async () => {
    const [an, binh] = [await signedIn(true), await signedIn()];
    const server = await serverOf(an.token, [binh.userId]);
    const gateway = await connectGateway(app, binh.token);
    const before = await server.send('Trước');
    await gateway.next('MESSAGE_CREATE', isMessage(before.id));

    await server.hideFrom(binh.id);
    const after = await server.send('Sau');
    await settle();
    expect(got(gateway, after.id)).toBe(false);
    gateway.close();
  });

  it('reaches a client connected to another instance (Redis Pub/Sub)', async () => {
    const [an, binh] = [await signedIn(true), await signedIn()];
    const server = await serverOf(an.token, [binh.userId]);
    const onOther = await connectGateway(other, binh.token);
    const message = await server.send('Qua Redis');
    const event = await onOther.next('MESSAGE_CREATE', isMessage(message.id));
    expect(event.d).toMatchObject({ server_id: server.id });
    // Each instance delivers only to the sessions it holds: no duplicate.
    await settle();
    expect(
      onOther.dispatches.filter(
        (x) => x.t === 'MESSAGE_CREATE' && isMessage(message.id)(x.d),
      ),
    ).toHaveLength(1);
    onOther.close();
  });
});
