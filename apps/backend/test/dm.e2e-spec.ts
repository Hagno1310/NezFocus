import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  CANNOT_MESSAGE_TEXT,
  ChannelRoutes,
  DmRoutes,
  ErrorCode,
  MessageRoutes,
  ProfileRoutes,
  RelationshipRoutes,
  ServerRoutes,
  SettingsRoutes,
  TypingRoutes,
  type DmChannel,
  type ReadState,
  type ServerResponse,
  type UserProfile,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import { DmAccessPolicy } from '../src/modules/channels/dm-access-policy.js';
import {
  channelRecipients,
  dmPairs,
} from '../src/modules/channels/dm.schema.js';
import {
  FriendshipStatus,
  friendships,
} from '../src/modules/friends/friends.schema.js';
import { readStates } from '../src/modules/messaging/messages.schema.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
import {
  channels,
  serverMembers,
} from '../src/modules/servers/servers.schema.js';
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

const messagesOf = (channelId: string) =>
  MessageRoutes.list.replace(':id', channelId);
const channel = (id: string) => ChannelRoutes.byId.replace(':id', id);
const typing = (id: string) => TypingRoutes.start.replace(':id', id);
const byUser = (id: string) => RelationshipRoutes.byUser.replace(':userId', id);
const settle = () => new Promise((r) => setTimeout(r, 300));

// REQ-DM-01..03, FRIEND-03 through REST, Postgres and the Gateway. Needs `pnpm dev:infra`.
describe('DM (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;

  const start = async (canSend?: boolean) => {
    ({ app, mailer } = await createTestApp((b) =>
      canSend === undefined
        ? b
        : b.overrideProvider(DmAccessPolicy).useValue({
            canView: async () => true,
            canSend: async () => canSend,
            canMessage: async () => true,
          }),
    ));
    await app.listen(0);
    db = app.get(DB);
  };

  const signedIn = async (name = 'An') => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const token = session.access_token;
    await http(app)
      .post('/auth/complete-account')
      .auth(token, { type: 'bearer' })
      .send({ ...completion(uniqueUsername()), display_name: name })
      .expect(200);
    const auth = { type: 'bearer' as const };
    return {
      id: session.user.id,
      userId: BigInt(session.user.id),
      token,
      get: (p: string) => http(app).get(p).auth(token, auth),
      post: (p: string) => http(app).post(p).auth(token, auth),
      put: (p: string) => http(app).put(p).auth(token, auth),
      patch: (p: string) => http(app).patch(p).auth(token, auth),
      delete: (p: string) => http(app).delete(p).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const friends = (a: Me, b: Me) => {
    const [low, high] = a.userId < b.userId ? [a, b] : [b, a];
    return db.insert(friendships).values({
      userIdLow: low.userId,
      userIdHigh: high.userId,
      status: FriendshipStatus.accepted,
      requestedBy: a.userId,
    });
  };

  const sharedServer = async (owner: Me, ...members: Me[]) => {
    const server = (
      await owner
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    if (members.length)
      await db.insert(serverMembers).values(
        members.map((m) => ({
          serverId: BigInt(server.id),
          userId: m.userId,
        })),
      );
    return server;
  };

  const open = (me: Me, other: Me) =>
    me.post(DmRoutes.create).send({ recipient_id: other.id });

  // Friends with a DM.
  const dmOf = async (a: Me, b: Me) => {
    await friends(a, b);
    return ((await open(a, b).expect(200)).body as DmChannel).id;
  };

  const send = (me: Me, channelId: string, content = 'Ok 👍') =>
    me.post(messagesOf(channelId)).send({ content, nonce: randomUUID() });

  const expect40303 = (res: { status: number; body: unknown }) => {
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      code: ErrorCode.CannotMessageUser,
      message: CANNOT_MESSAGE_TEXT,
    });
  };

  describe('DM in the message pipeline (P2-B3.1 #114)', () => {
    beforeAll(() => start());
    afterAll(() => app.close());

    it('REQ-DM-01: a person of the DM sends and reads without server RBAC', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      await send(an, dm).expect(201);
      const history = await binh.get(messagesOf(dm)).expect(200);
      expect(history.body.map((m: { content: string }) => m.content)).toEqual([
        'Ok 👍',
      ]);
    });

    it('someone outside the DM gets 40401, as for a channel they cannot view', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const chi = await signedIn('Chi');
      const dm = await dmOf(an, binh);
      const res = await send(chi, dm).expect(404);
      expect(res.body.code).toBe(ErrorCode.NotFound);
      await chi.get(messagesOf(dm)).expect(404);
    });

    it('CR-12 #3: a DM keeps a mention of its people only, nothing of roles or @everyone', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const chi = await signedIn('Chi');
      const dm = await dmOf(an, binh);
      const res = await send(
        an,
        dm,
        `<@${binh.id}> <@${chi.id}> @everyone`,
      ).expect(201);
      expect(res.body.mention_user_ids).toEqual([binh.id]);
      expect(res.body.mention_everyone).toBe(false);
    });

    it('typing in a DM reaches the other person only', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      const gw = await connectGateway(app, binh.token);
      await an.post(typing(dm)).expect(204);
      const got = await gw.next('TYPING_START');
      expect(got.d).toMatchObject({ channel_id: dm, server_id: null });
      gw.close();
    });

    it('CR-28: DELETE closes the DM on my side only; READY lists what is open', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      const before = await connectGateway(app, an.token);
      const ready = before.ready() as { private_channels: DmChannel[] };
      expect(ready.private_channels).toEqual([
        {
          id: dm,
          type: 'dm',
          recipient: expect.objectContaining({
            id: binh.id,
            display_name: 'Bình',
            deleted: false,
          }),
          last_message_id: null,
        },
      ]);
      before.close();

      await an.delete(channel(dm)).expect(204);
      const rows = await db
        .select()
        .from(channelRecipients)
        .where(eq(channelRecipients.channelId, BigInt(dm)));
      expect(
        Object.fromEntries(rows.map((r) => [String(r.userId), r.closed])),
      ).toEqual({ [an.id]: true, [binh.id]: false });
      const [live] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, BigInt(dm)));
      expect(live?.deletedAt).toBeNull();
      await an.get(messagesOf(dm)).expect(200);
    });

    it('DELETE on a DM I am not in is 40401', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const chi = await signedIn('Chi');
      const dm = await dmOf(an, binh);
      await chi.delete(channel(dm)).expect(404);
    });
  });

  describe('DM 1-1 (P2-B3.2 #115)', () => {
    beforeAll(() => start());
    afterAll(() => app.close());

    it('DM-03 AC1: opening again, from either side, gives the same DM', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const first = await dmOf(an, binh);
      expect((await open(an, binh).expect(200)).body.id).toBe(first);
      const fromBinh = (await open(binh, an).expect(200)).body as DmChannel;
      expect(fromBinh).toMatchObject({
        id: first,
        type: 'dm',
        recipient: { id: an.id, display_name: 'An', deleted: false },
      });
    });

    it('DM-03 AC2: two requests at once make one DM', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      await friends(an, binh);
      const [a, b] = await Promise.all([open(an, binh), open(binh, an)]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect(a.body.id).toBe(b.body.id);
      const pairs = await db
        .select()
        .from(dmPairs)
        .where(eq(dmPairs.channelId, BigInt(a.body.id)));
      expect(pairs).toHaveLength(1);
    });

    it('a new DM reaches the other with CHANNEL_CREATE; yourself or nobody is 40401', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      await friends(an, binh);
      const gw = await connectGateway(app, binh.token);
      const dm = (await open(an, binh).expect(200)).body as DmChannel;
      const created = await gw.next('CHANNEL_CREATE');
      expect(created.d).toMatchObject({ id: dm.id, recipient: { id: an.id } });
      gw.close();
      await open(an, an).expect(404);
      await an.post(DmRoutes.create).send({ recipient_id: '1' }).expect(404);
    });

    it('CR-28: a closed DM opens again on that side with a new message, CHANNEL_CREATE to them', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      await an.delete(channel(dm)).expect(204);
      const gw = await connectGateway(app, an.token);
      expect(
        (gw.ready() as { private_channels: DmChannel[] }).private_channels,
      ).toEqual([]);
      const sent = (await send(binh, dm, 'Mai đi thư viện không?').expect(201))
        .body as { id: string };
      const reopened = await gw.next('CHANNEL_CREATE');
      expect(reopened.d).toMatchObject({ id: dm, last_message_id: sent.id });
      gw.close();
      const [row] = await db
        .select()
        .from(channelRecipients)
        .where(eq(channelRecipients.userId, an.userId));
      expect(row?.closed).toBe(false);
    });

    it('DM-01 AC1: friends — B gets MESSAGE_CREATE (server_id null); no mention count, no inbox item', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      const gw = await connectGateway(app, binh.token);
      await send(an, dm, `<@${binh.id}> ôn tiếp nhé`).expect(201);
      const got = await gw.next('MESSAGE_CREATE');
      expect(got.d).toMatchObject({ channel_id: dm, server_id: null });
      gw.close();
      await settle();
      const [state] = await db
        .select()
        .from(readStates)
        .where(eq(readStates.userId, binh.userId));
      expect(state?.mentionCount ?? 0).toBe(0);
      const items = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, binh.userId));
      expect(items).toEqual([]);
    });

    it('NOTIF-01: READY carries the read state of my open DMs; ack works', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      const sent = (await send(an, dm).expect(201)).body as { id: string };
      const gw = await connectGateway(app, binh.token);
      const states = (gw.ready() as { read_states: ReadState[] }).read_states;
      expect(states).toContainEqual({
        channel_id: dm,
        server_id: null,
        last_read_message_id: null,
        last_message_id: sent.id,
        mention_count: 0,
      });
      gw.close();
      await binh
        .post(
          MessageRoutes.ack.replace(':id', dm).replace(':messageId', sent.id),
        )
        .expect(204);
    });

    it('DM-02: same server, not friends, recipient left it on → opens and sends', async () => {
      const an = await signedIn();
      const khanh = await signedIn('Khánh');
      await sharedServer(an, khanh);
      const dm = (await open(an, khanh).expect(200)).body as DmChannel;
      await send(an, dm.id).expect(201);
    });

    it('DM-02 AC1: recipient turned DMs from members off → 40303, same sentence', async () => {
      const an = await signedIn();
      const khanh = await signedIn('Khánh');
      await sharedServer(an, khanh);
      const dm = (await open(an, khanh).expect(200)).body as DmChannel;
      await khanh
        .patch(SettingsRoutes.settings)
        .send({ allow_dm_from_server_members: false })
        .expect(200);
      expect40303(await send(an, dm.id));
      expect40303(await an.post(typing(dm.id)));
      // An did not turn it off: Khánh still writes to An.
      await send(khanh, dm.id).expect(201);
    });

    it('DM-02 AC2: no shared server, not friends → 40303 to open, and to send in an old DM after unfriending', async () => {
      const an = await signedIn();
      const lan = await signedIn('Lan');
      expect40303(await open(an, lan));
      const minh = await signedIn('Minh');
      const dm = await dmOf(an, minh);
      await an.delete(byUser(minh.id)).expect(204);
      // REQ-DM-03: the old DM still opens and reads; only sending is refused.
      expect((await open(an, minh).expect(200)).body.id).toBe(dm);
      await an.get(messagesOf(dm)).expect(200);
      expect40303(await send(an, dm));
    });

    it('FRIEND-03 AC1 / AC3: a block refuses both ways; unblocking restores DM-02', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      await sharedServer(an, binh);
      await an.put(byUser(binh.id)).send({ type: 'blocked' }).expect(200);
      expect40303(await send(binh, dm));
      expect40303(await send(an, dm));
      await an.delete(byUser(binh.id)).expect(204);
      // Not friends any more, but they share a server.
      await send(binh, dm).expect(201);
    });

    it("a deleted account's DM is kept, reads as deleted, cannot be written to", async () => {
      const an = await signedIn();
      const tuan = await signedIn('Tuấn');
      const dm = await dmOf(an, tuan);
      await db
        .update(users)
        .set({ accountStatus: 'deleted' })
        .where(eq(users.id, tuan.userId));
      const seen = (await open(an, tuan).expect(200)).body as DmChannel;
      expect(seen.recipient).toEqual({
        id: tuan.id,
        username: null,
        display_name: null,
        avatar: null,
        deleted: true,
      });
      expect40303(await send(an, dm));
      // SRS 11.1: no DM yet with an account pending deletion → 40303 as well.
      const ha = await signedIn('Hà');
      await friends(ha, tuan);
      expect40303(await open(ha, tuan));
    });
  });

  describe('GET /users/{id}/profile (P2-B3.4 #117)', () => {
    beforeAll(() => start());
    afterAll(() => app.close());

    const profileOf = (me: Me, other: Me | string) =>
      me.get(
        ProfileRoutes.byUser.replace(
          ':id',
          typeof other === 'string' ? other : other.id,
        ),
      );

    it('AUTH-06 AC5: SERVER CHUNG lists only servers both are in, in my rail order', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const first = await sharedServer(an, binh);
      await sharedServer(an); // An alone
      const second = await sharedServer(binh, an);
      await sharedServer(binh); // Bình alone
      const res = (await profileOf(an, binh).expect(200)).body as UserProfile;
      expect(res.mutual_servers.map((s) => s.id)).toEqual([
        first.id,
        second.id,
      ]);
      expect(res).toMatchObject({
        user: { id: binh.id, display_name: 'Bình' },
        deleted: false,
        relationship: 'none',
        can_message: true,
      });
    });

    it('relationship as seen by me; outside every server and not friends → cannot message', async () => {
      const an = await signedIn();
      const minh = await signedIn('Minh');
      await friends(an, minh);
      expect((await profileOf(an, minh).expect(200)).body).toMatchObject({
        relationship: 'friend',
        mutual_servers: [],
        can_message: true,
      });
      const quan = await signedIn('Quân');
      expect((await profileOf(an, quan).expect(200)).body).toMatchObject({
        relationship: 'none',
        can_message: false,
      });
    });

    it('someone who blocked me answers as usual, only can_message is false; I see "blocked" for mine', async () => {
      const an = await signedIn();
      const phong = await signedIn('Phong');
      await sharedServer(an, phong);
      await phong.put(byUser(an.id)).send({ type: 'blocked' }).expect(200);
      expect((await profileOf(an, phong).expect(200)).body).toMatchObject({
        user: { display_name: 'Phong' },
        relationship: 'none',
        can_message: false,
      });
      expect((await profileOf(phong, an).expect(200)).body).toMatchObject({
        relationship: 'blocked',
        can_message: false,
      });
    });

    it('a deleted account reads as deleted; an unknown id is 40401', async () => {
      const an = await signedIn();
      const tuan = await signedIn('Tuấn');
      await sharedServer(an, tuan);
      await db
        .update(users)
        .set({ accountStatus: 'pending_deletion' })
        .where(eq(users.id, tuan.userId));
      expect((await profileOf(an, tuan).expect(200)).body).toEqual({
        user: {
          id: tuan.id,
          username: null,
          display_name: null,
          avatar: null,
          bio: null,
        },
        deleted: true,
        relationship: 'none',
        mutual_servers: [],
        can_message: false,
      });
      const res = await profileOf(an, '1').expect(404);
      expect(res.body.code).toBe(ErrorCode.NotFound);
    });
  });

  describe('when the policy refuses', () => {
    beforeAll(() => start(false));
    afterAll(() => app.close());

    it('FRIEND-03 AC1 / DM-02: sending and typing get 40303 with the one sentence', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmOf(an, binh);
      expect40303(await send(an, dm));
      expect40303(await an.post(typing(dm)));
    });
  });
});
