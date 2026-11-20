import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  InviteRoutes,
  ServerRoutes,
  type InvitePreview,
  type InviteResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import {
  invites,
  serverBans,
  serverMembers,
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

const create = (channelId: string) =>
  InviteRoutes.create.replace(':id', channelId);
const byCode = (code: string) => InviteRoutes.byCode.replace(':code', code);
const accept = (code: string) => InviteRoutes.accept.replace(':code', code);

// REQ-SRV-03 / SRV-04 through REST and Postgres. Needs `pnpm dev:infra`.
describe('Invites (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const events: { to: string; id: bigint; t: string }[] = [];

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
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  // Each test its own IP, so the guessing limit of one never touches another.
  const ip = () =>
    `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  const signedIn = async () => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    const auth = { type: 'bearer' as const };
    const api = http(app);
    const from = ip();
    return {
      userId: BigInt(session.user.id),
      post: (path: string) =>
        api
          .post(path)
          .auth(session.access_token, auth)
          .set('X-Forwarded-For', from),
      get: (path: string) =>
        api
          .get(path)
          .auth(session.access_token, auth)
          .set('X-Forwarded-For', from),
      delete: (path: string) =>
        api
          .delete(path)
          .auth(session.access_token, auth)
          .set('X-Forwarded-For', from),
    };
  };

  const ownerWithInvite = async (body: object = {}) => {
    const an = await signedIn();
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'CLB Guitar PTIT', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    const text = server.channels.find((c) => c.type === 'text')!;
    const invite = (await an.post(create(text.id)).send(body).expect(201))
      .body as InviteResponse;
    return { an, server, text, invite };
  };

  const usesOf = async (code: string) =>
    (await db.select().from(invites).where(eq(invites.code, code)))[0]!.uses;

  it('SRV-03 v1.5: the same settings give back the same invite (200), others a new one', async () => {
    const { an, text, invite } = await ownerWithInvite();
    expect(invite.code).toMatch(/^[A-Za-z0-9]{8}$/);
    const again = await an.post(create(text.id)).send({}).expect(200);
    expect(again.body.code).toBe(invite.code);
    const other = await an
      .post(create(text.id))
      .send({ max_age: 1800, max_uses: 5 })
      .expect(201);
    expect(other.body.code).not.toBe(invite.code);
    await an.post(create(text.id)).send({ max_uses: 7 }).expect(400);
  });

  it('SRV-04 AC1: preview without signing in, then join: member, uses + 1, events', async () => {
    const { server, invite } = await ownerWithInvite();
    const preview = await http(app)
      .get(byCode(invite.code))
      .set('X-Forwarded-For', ip())
      .expect(200);
    expect(preview.body as InvitePreview).toMatchObject({
      server: { id: server.id, name: 'CLB Guitar PTIT', member_count: 1 },
      inviter: { display_name: 'An Nguyễn' },
      channel: null,
    });

    const binh = await signedIn();
    events.length = 0;
    const joined = await binh.post(accept(invite.code)).expect(200);
    expect((joined.body as ServerResponse).id).toBe(server.id);
    expect(await usesOf(invite.code)).toBe(1);
    expect(events.map((e) => [e.to, e.t])).toEqual([
      ['user', 'SERVER_CREATE'],
      ['server', 'SERVER_MEMBER_ADD'],
    ]);

    // AC3: again → 200, uses unchanged.
    await binh.post(accept(invite.code)).expect(200);
    expect(await usesOf(invite.code)).toBe(1);
  });

  it('two accepts at once by the same user make one member and one use', async () => {
    const { server, invite } = await ownerWithInvite({ max_uses: 1 });
    const binh = await signedIn();
    const results = await Promise.all([
      binh.post(accept(invite.code)),
      binh.post(accept(invite.code)),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const rows = await db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, BigInt(server.id)),
          eq(serverMembers.userId, binh.userId),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(await usesOf(invite.code)).toBe(1);
  });

  it('SRV-03 AC1: a 1-use invite used once → 40041 for the next person', async () => {
    const { invite } = await ownerWithInvite({ max_uses: 1 });
    await (await signedIn()).post(accept(invite.code)).expect(200);
    const res = await (await signedIn()).post(accept(invite.code)).expect(410);
    expect(res.body.code).toBe(ErrorCode.InviteInvalid);
    expect(await usesOf(invite.code)).toBe(1);
  });

  it('SRV-04 AC2: a banned user → 40306, uses unchanged', async () => {
    const { server, invite } = await ownerWithInvite();
    const binh = await signedIn();
    await db
      .insert(serverBans)
      .values({ serverId: BigInt(server.id), userId: binh.userId });
    const res = await binh.post(accept(invite.code)).expect(403);
    expect(res.body.code).toBe(ErrorCode.BannedFromServer);
    expect(await usesOf(invite.code)).toBe(0);
  });

  it('SRV-03 AC4 / AC5: only the creator or MANAGE_SERVER revokes; then 40041', async () => {
    const { an, invite } = await ownerWithInvite();
    const binh = await signedIn();
    await binh.post(accept(invite.code)).expect(200);
    const refused = await binh.delete(byCode(invite.code)).expect(403);
    expect(refused.body.code).toBe(ErrorCode.Forbidden);
    await an.delete(byCode(invite.code)).expect(204);
    const gone = await http(app)
      .get(byCode(invite.code))
      .set('X-Forwarded-For', ip())
      .expect(410);
    expect(gone.body.code).toBe(ErrorCode.InviteInvalid);
  });

  it('SRV-03 v1.7: the server list needs MANAGE_SERVER and shows live invites with their creator', async () => {
    const { an, server, invite } = await ownerWithInvite();
    const list = await an
      .get(InviteRoutes.forServer.replace(':id', server.id))
      .expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        code: invite.code,
        creator: expect.objectContaining({ display_name: 'An Nguyễn' }),
      }),
    ]);
    const binh = await signedIn();
    await binh.post(accept(invite.code)).expect(200);
    await binh
      .get(InviteRoutes.forServer.replace(':id', server.id))
      .expect(403);
  });

  it('SRV-03 AC3: the 31st unknown code in a minute from one IP → 40029 with Retry-After', async () => {
    const from = ip();
    for (let i = 0; i < 30; i++)
      await http(app)
        .get(byCode(randomUUID().replace(/-/g, '').slice(0, 8)))
        .set('X-Forwarded-For', from)
        .expect(410);
    const res = await http(app)
      .get(byCode('zzzzzzzz'))
      .set('X-Forwarded-For', from)
      .expect(429);
    expect(res.body.code).toBe(ErrorCode.RateLimited);
    expect(Number(res.header['retry-after'])).toBeGreaterThan(0);
  });

  it('SRV-07 AC2 / AC6 / AC7: /invite/<code> at the site root, plain card once revoked', async () => {
    const { an, invite } = await ownerWithInvite();
    const page = await request(app.getHttpServer())
      .get(`/invite/${invite.code}`)
      .set('X-Forwarded-For', ip())
      .expect(200)
      .expect('Content-Type', /text\/html/);
    expect(page.text).toContain(
      '<meta property="og:title" content="CLB Guitar PTIT">',
    );
    await an.delete(byCode(invite.code)).expect(204);
    const gone = await request(app.getHttpServer())
      .get(`/invite/${invite.code}`)
      .set('X-Forwarded-For', ip())
      .expect(200);
    expect(gone.text).toContain(
      '<meta property="og:title" content="NezFocus">',
    );
    expect(gone.text).not.toContain('CLB Guitar');
  });

  it('serves /.well-known/assetlinks.json for app.nezfocus', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/assetlinks.json')
      .expect(200);
    expect(res.body[0].target.package_name).toBe('app.nezfocus');
  });
});
