import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  AuthRoutes,
  DmRoutes,
  MessageRoutes,
  PushTokenRoutes,
  RelationshipRoutes,
  ServerRoutes,
  SettingsRoutes,
  mentionToken,
  type DmChannel,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import {
  FriendshipStatus,
  friendships,
} from '../src/modules/friends/friends.schema.js';
import {
  PushSender,
  type PushJob,
  type SendResult,
} from '../src/modules/notifications/push-sender.js';
import { pushTokens } from '../src/modules/notifications/push-tokens.schema.js';
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

class CapturingSender extends PushSender {
  readonly jobs: PushJob[] = [];
  readonly dead = new Set<string>();

  async send(job: PushJob): Promise<SendResult> {
    if (this.dead.has(job.token)) return 'unregistered';
    this.jobs.push(job);
    return 'sent';
  }
}

const messagesOf = (id: string) => MessageRoutes.list.replace(':id', id);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// REQ-NOTIF-02/04, REQ-AUTH-07 AC1 through REST, Postgres, Redis (BullMQ) and the Gateway;
// FCM is a capturing fake. Needs `pnpm dev:infra`.
describe('Push (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const sender = new CapturingSender();

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(PushSender).useValue(sender),
    ));
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    sender.jobs.length = 0;
  });

  const signedIn = async (name = 'An') => {
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
      patch: (p: string) => http(app).patch(p).auth(token, auth),
      delete: (p: string) => http(app).delete(p).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const register = (me: Me, token = `fcm-${randomUUID()}`) =>
    me
      .put(PushTokenRoutes.register)
      .send({ token, kind: 'fcm' })
      .expect(204)
      .then(() => token);

  const tokensOf = (me: Me) =>
    db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, me.userId))
      .then((rows) => rows.map((r) => r.token));

  // The push leaves from a BullMQ job: wait for it, or long enough to be sure there is none.
  const pushesTo = async (token: string, expected = 1) => {
    for (let i = 0; i < 60; i++) {
      const got = sender.jobs.filter((j) => j.token === token);
      if (got.length >= expected) return got;
      await wait(50);
    }
    return sender.jobs.filter((j) => j.token === token);
  };
  const noPushTo = async (token: string) => {
    await wait(800);
    return sender.jobs.filter((j) => j.token === token);
  };

  const serverWith = async (owner: Me, ...members: Me[]) => {
    const server = (
      await owner
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db
      .insert(serverMembers)
      .values(
        members.map((m) => ({ serverId: BigInt(server.id), userId: m.userId })),
      );
    const text = server.channels.find((c) => c.type === 'text');
    if (!text) throw new Error('no text channel');
    return { server, channel: text };
  };

  const say = (me: Me, channelId: string, content: string) =>
    me
      .post(messagesOf(channelId))
      .send({ content, nonce: randomUUID() })
      .expect(201);

  const befriend = (a: Me, b: Me) => {
    const [low, high] = a.userId < b.userId ? [a, b] : [b, a];
    return db.insert(friendships).values({
      userIdLow: low.userId,
      userIdHigh: high.userId,
      status: FriendshipStatus.accepted,
      requestedBy: a.userId,
    });
  };

  describe('push tokens (SRS 5.3 Devices)', () => {
    it('registers a token for the session; an FCM refresh replaces it', async () => {
      const an = await signedIn();
      const first = await register(an);
      expect(await tokensOf(an)).toEqual([first]);
      const second = await register(an);
      expect(await tokensOf(an)).toEqual([second]);
    });

    it('moves a token to the account now signed in on that phone', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const token = await register(an);
      await register(binh, token);
      expect(await tokensOf(an)).toEqual([]);
      expect(await tokensOf(binh)).toEqual([token]);
    });

    it('(negative) refuses an unknown kind', async () => {
      const an = await signedIn();
      const res = await an
        .put(PushTokenRoutes.register)
        .send({ token: 'x', kind: 'webpush' })
        .expect(400);
      expect(res.body.code).toBe(40001);
    });

    it('DELETE removes it', async () => {
      const an = await signedIn();
      const token = await register(an);
      await an.delete(PushTokenRoutes.remove(token)).expect(204);
      expect(await tokensOf(an)).toEqual([]);
    });

    it('REQ-AUTH-07 AC1: signing out removes the token of that device', async () => {
      const an = await signedIn();
      await register(an);
      await an.post(AuthRoutes.logout).expect(204);
      expect(await tokensOf(an)).toEqual([]);
    });
  });

  describe('sending (REQ-NOTIF-02)', () => {
    it('AC1: a mention reaches the phone of someone not in the app', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      const token = await register(binh);
      const { server, channel } = await serverWith(an, binh);
      await say(an, channel.id, `${mentionToken.user(binh.id)} họp lúc 9h`);
      const [job] = await pushesTo(token);
      expect(job?.payload).toMatchObject({
        type: 'mention',
        server_id: server.id,
        channel_id: channel.id,
        title: `An nhắc tới bạn ở #${channel.name}`,
        body: '@Bình họp lúc 9h',
      });
    });

    it('writes it in the language of the recipient', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      await binh
        .patch(SettingsRoutes.settings)
        .send({ locale: 'en' })
        .expect(200);
      const token = await register(binh);
      const { channel } = await serverWith(an, binh);
      await say(an, channel.id, `${mentionToken.user(binh.id)} hi`);
      const [job] = await pushesTo(token);
      expect(job?.payload.title).toBe(`An mentioned you in #${channel.name}`);
    });

    it('AC2: "Ẩn nội dung" leaves only "Bạn có tin nhắn mới"', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      await binh
        .patch(SettingsRoutes.settings)
        .send({ hide_push_content: true })
        .expect(200);
      const token = await register(binh);
      const { channel } = await serverWith(an, binh);
      await say(an, channel.id, `${mentionToken.user(binh.id)} bí mật`);
      const [job] = await pushesTo(token);
      expect(job?.payload).toMatchObject({
        title: 'NezFocus',
        body: 'Bạn có tin nhắn mới',
      });
      expect(JSON.stringify(job?.payload)).not.toMatch(/bí mật|An|#/);
    });

    it('AC4 (âm): no push from someone the recipient blocked', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      const token = await register(binh);
      const { channel } = await serverWith(an, binh);
      await binh
        .put(RelationshipRoutes.byUser.replace(':userId', an.id))
        .send({ type: 'blocked' })
        .expect(200);
      await say(an, channel.id, `${mentionToken.user(binh.id)} ơi`);
      expect(await noPushTo(token)).toEqual([]);
    });

    it('DEC-34 (âm): no push while the recipient has the app in the foreground', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      const token = await register(binh);
      const { channel } = await serverWith(an, binh);
      const gateway = await connectGateway(app, binh.token);
      await say(an, channel.id, `${mentionToken.user(binh.id)} ơi`);
      expect(await noPushTo(token)).toEqual([]);
      // In the background (screen locked in a room, socket alive): push again.
      gateway.send(12, { state: 'background' });
      await wait(100);
      await say(an, channel.id, `${mentionToken.user(binh.id)} ơi lần 2`);
      expect(await pushesTo(token)).toHaveLength(1);
      gateway.close();
    });

    it('pushes a DM with the sender as title', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      const token = await register(binh);
      await befriend(an, binh);
      const dm = (
        (
          await an
            .post(DmRoutes.create)
            .send({ recipient_id: binh.id })
            .expect(200)
        ).body as DmChannel
      ).id;
      await say(an, dm, 'tối nay học không');
      const [job] = await pushesTo(token);
      expect(job?.payload).toMatchObject({
        type: 'dm',
        channel_id: dm,
        title: 'An',
        body: 'tối nay học không',
      });
      expect(await tokensOf(an)).toEqual([]); // the sender has none; nothing sent to them
    });

    it('pushes a friend request with its note', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      const token = await register(binh);
      await an
        .post(RelationshipRoutes.list)
        .send({ username: binh.username, message: 'Mình là An lớp K22' })
        .expect(201);
      const [job] = await pushesTo(token);
      expect(job?.payload).toMatchObject({
        type: 'friend_request',
        title: 'An muốn kết bạn',
        body: 'Mình là An lớp K22',
      });
    });

    it('REQ-NOTIF-04 AC3: a token FCM no longer knows is removed', async () => {
      const an = await signedIn('An');
      const binh = await signedIn('Bình');
      const token = await register(binh);
      sender.dead.add(token);
      await an
        .post(RelationshipRoutes.list)
        .send({ username: binh.username })
        .expect(201);
      for (let i = 0; i < 40 && (await tokensOf(binh)).length; i++)
        await wait(50);
      expect(await tokensOf(binh)).toEqual([]);
    });
  });
});
