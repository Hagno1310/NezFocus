import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  RelationshipRoutes,
  ServerRoutes,
  SoloRoutes,
  type Relationship,
  type ServerResponse,
  type UserLookupResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import { friendships } from '../src/modules/friends/friends.schema.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
import { serverMembers } from '../src/modules/servers/servers.schema.js';
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

const byUser = (id: string) => RelationshipRoutes.byUser.replace(':userId', id);
const settle = () => new Promise((r) => setTimeout(r, 300));

// REQ-FRIEND-01..03 through REST, Postgres and the Gateway. Needs `pnpm dev:infra`.
describe('Friends (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const signedIn = async (name: string) => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const token = session.access_token;
    const username = uniqueUsername();
    await http(app)
      .post('/auth/complete-account')
      .auth(token, { type: 'bearer' })
      .send({ ...completion(username), display_name: name })
      .expect(200);
    const auth = { type: 'bearer' as const };
    return {
      id: session.user.id,
      userId: BigInt(session.user.id),
      username,
      token,
      get: (p: string) => http(app).get(p).auth(token, auth),
      post: (p: string) => http(app).post(p).auth(token, auth),
      put: (p: string) => http(app).put(p).auth(token, auth),
      delete: (p: string) => http(app).delete(p).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const invite = (from: Me, to: Me, message?: string) =>
    from
      .post(RelationshipRoutes.list)
      .send(
        message
          ? { username: to.username, message }
          : { username: to.username },
      );

  const itemsOf = (userId: bigint) =>
    db.select().from(notifications).where(eq(notifications.userId, userId));

  it('request with a message → accept: lists, items, events, presence of a friend with no shared server', async () => {
    const [an, mai] = await Promise.all(['An', 'Mai'].map(signedIn));
    const gAn = await connectGateway(app, an.token);
    const gMai = await connectGateway(app, mai.token);

    const sent = await invite(
      an,
      mai,
      'Mình là An, nhóm ôn Giải tích tối nay nhé',
    )
      .set('Idempotency-Key', 'k-1')
      .expect(201);
    expect(sent.body).toMatchObject({ type: 'outgoing', user: { id: mai.id } });
    // REQ-MSG-09: the same key replays, no second request
    const again = await invite(
      an,
      mai,
      'Mình là An, nhóm ôn Giải tích tối nay nhé',
    )
      .set('Idempotency-Key', 'k-1')
      .expect(201);
    expect(again.body).toEqual(sent.body);

    const incoming = (await gMai.next('RELATIONSHIP_ADD')).d as Relationship;
    expect(incoming).toMatchObject({
      type: 'incoming',
      request_message: 'Mình là An, nhóm ôn Giải tích tối nay nhé',
      user: { id: an.id },
    });
    expect((await itemsOf(mai.userId)).map((n) => n.type)).toEqual([
      'friend_request',
    ]);

    const accepted = await mai
      .put(byUser(an.id))
      .send({ type: 'friend' })
      .expect(200);
    expect(accepted.body).toMatchObject({
      type: 'friend',
      request_message: null,
    });
    const [row] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.requestedBy, an.userId));
    expect(row.requestMessage).toBeNull();
    await gAn.next(
      'RELATIONSHIP_ADD',
      (d) => (d as Relationship).type === 'friend',
    );
    expect((await itemsOf(an.userId)).map((n) => n.type)).toEqual([
      'friend_accepted',
    ]);

    // Presence: friends with no shared server see each other at once.
    await gAn.next(
      'PRESENCE_UPDATE',
      (d) => (d as { user_id: string }).user_id === mai.id,
    );
    expect((await an.get(RelationshipRoutes.list).expect(200)).body).toEqual([
      expect.objectContaining({
        type: 'friend',
        user: expect.objectContaining({ id: mai.id }),
      }),
    ]);
    const gMai2 = await connectGateway(app, mai.token);
    expect(
      (gMai2.ready() as { relationships: Relationship[] }).relationships,
    ).toEqual([expect.objectContaining({ type: 'friend' })]);

    // AC2: already friends
    const dup = await invite(an, mai);
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe(ErrorCode.AlreadyFriends);
    for (const g of [gAn, gMai, gMai2]) g.close();
  });

  it('AC1 pending twice → 40902; decline deletes the row and the item; AC8 message 151 → 40001', async () => {
    const [an, mai] = await Promise.all(['An', 'Mai'].map(signedIn));
    const long = await invite(an, mai, 'a'.repeat(151));
    expect(long.status).toBe(400);
    expect(long.body.code).toBe(ErrorCode.ValidationError);
    expect(long.body.errors).toHaveProperty('message');

    await invite(an, mai).expect(201);
    const dup = await invite(an, mai);
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe(ErrorCode.FriendRequestAlreadyPending);

    await mai.delete(byUser(an.id)).expect(204);
    expect(
      await db
        .select()
        .from(friendships)
        .where(and(eq(friendships.requestedBy, an.userId))),
    ).toEqual([]);
    expect(await itemsOf(mai.userId)).toEqual([]);
    expect(await itemsOf(an.userId)).toEqual([]); // FRIEND-02 AC3
  });

  it('AC4 / AC9: blocked → lookup shows a normal card, sending is 40303; unblock restores nothing', async () => {
    const [an, mai] = await Promise.all(['An', 'Mai'].map(signedIn));
    await invite(an, mai).expect(201);
    await mai.put(byUser(an.id)).send({ type: 'friend' }).expect(200);
    await mai.put(byUser(an.id)).send({ type: 'blocked' }).expect(200);

    const card = await an
      .get(
        `${RelationshipRoutes.lookup}?username=@${mai.username.toUpperCase()}`,
      )
      .expect(200);
    expect((card.body as UserLookupResponse).relationship).toBe('none');
    const blocked = await invite(an, mai);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe(ErrorCode.CannotMessageUser);
    expect((await an.get(RelationshipRoutes.list).expect(200)).body).toEqual(
      [],
    );

    await mai.delete(byUser(an.id)).expect(204);
    expect((await mai.get(RelationshipRoutes.list).expect(200)).body).toEqual(
      [],
    );
    await invite(an, mai).expect(201);
  });

  it('lookup: mutual servers by name; unknown → 40401; AC7 31st in a minute → 40029 with Retry-After', async () => {
    const [an, mai] = await Promise.all(['An', 'Mai'].map(signedIn));
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db
      .insert(serverMembers)
      .values({ serverId: BigInt(server.id), userId: mai.userId });

    const card = await an
      .get(`${RelationshipRoutes.lookup}?username=${mai.username}`)
      .expect(200);
    expect(card.body).toMatchObject({
      user: { id: mai.id, display_name: 'Mai', bio: null },
      relationship: 'none',
      mutual_servers: [{ id: server.id, name: 'Ôn thi Giải tích 2' }],
    });
    const missing = await an.get(
      `${RelationshipRoutes.lookup}?username=khong.co.ai`,
    );
    expect(missing.status).toBe(404);
    for (let i = 0; i < 28; i++)
      await an
        .get(`${RelationshipRoutes.lookup}?username=${mai.username}`)
        .expect(200);
    const fast = await an.get(
      `${RelationshipRoutes.lookup}?username=${mai.username}`,
    );
    expect(fast.status).toBe(429);
    expect(fast.body.code).toBe(ErrorCode.RateLimited);
    expect(Number(fast.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('AUTH-05 AC5: in a shared server, a block hides the study activity, not the status', async () => {
    const [an, mai, binh] = await Promise.all(
      ['An', 'Mai', 'Bình'].map(signedIn),
    );
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db.insert(serverMembers).values(
      [mai, binh].map((m) => ({
        serverId: BigInt(server.id),
        userId: m.userId,
      })),
    );
    await mai.put(byUser(an.id)).send({ type: 'blocked' }).expect(200);
    const gMai = await connectGateway(app, mai.token);
    const gBinh = await connectGateway(app, binh.token);
    const gAn = await connectGateway(app, an.token);
    await an
      .post(SoloRoutes.start)
      .send({ cycle_config: { focus_min: 25, short_break_min: 5 } })
      .expect(201);
    type P = { user_id: string; status: string; activity: unknown };
    await gBinh.next(
      'PRESENCE_UPDATE',
      (d) => (d as P).user_id === an.id && (d as P).activity !== null,
    );
    await settle();
    const seenByMai = gMai.dispatches
      .filter((x) => x.t === 'PRESENCE_UPDATE')
      .map((x) => x.d as P)
      .filter((d) => d.user_id === an.id);
    expect(seenByMai.at(-1)).toMatchObject({
      status: 'online',
      activity: null,
    });
    expect(seenByMai.every((d) => d.activity === null)).toBe(true);
    for (const g of [gAn, gMai, gBinh]) g.close();
  });
});
