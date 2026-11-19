import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  IDEMPOTENCY_KEY_HEADER,
  MessageRoutes,
  Permission as P,
  ServerRoutes,
  type ChannelResponse,
  type MessageCreateEvent,
  type MessageResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { messages } from '../src/modules/messaging/messages.schema.js';
import {
  channels,
  serverMembers,
} from '../src/modules/servers/servers.schema.js';
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
const permission = (channelId: string, targetId: string) =>
  ChannelRoutes.permission
    .replace(':id', channelId)
    .replace(':targetId', targetId);
const nonce = () => randomUUID();

// REQ-MSG-01, MSG-09, SEARCH-02 with Postgres, Redis and the Gateway. Needs `pnpm dev:infra`.
describe('Messages (e2e)', () => {
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
      id: session.user.id,
      token,
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      put: (path: string) => api.put(path).auth(token, auth),
      patch: (path: string) => api.patch(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An's general server with these members: #general and a voice channel.
  const serverOf = async (an: Me, ...members: Me[]) => {
    const server = (
      await an
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
    const of = (type: string) => server.channels.find((c) => c.type === type)!;
    return { id: server.id, text: of('text'), voice: of('voice') };
  };

  const send = (me: Me, channelId: string, content: string, n = nonce()) =>
    me.post(messagesOf(channelId)).send({ content, nonce: n });

  describe('REQ-MSG-01', () => {
    it('AC1: saves, answers 201 with the nonce, moves last_message_id and sends MESSAGE_CREATE', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const gateway = await connectGateway(app, binh.token);
      const n = nonce();
      const sentAt = Date.now();
      const res = await send(an, server.text.id, 'Tối nay ôn chương 3 nhé', n);
      expect(res.status).toBe(201);
      const message = res.body as MessageResponse;
      expect(message).toMatchObject({
        channel_id: server.text.id,
        content: 'Tối nay ôn chương 3 nhé',
        nonce: n,
        type: 'default',
        author: { id: an.id },
      });

      const event = await gateway.next(
        'MESSAGE_CREATE',
        (d) => (d as MessageCreateEvent).id === message.id,
      );
      expect(event.d).toMatchObject({ nonce: n, server_id: server.id });
      // Target ≤ 300 ms P95 once the real fanout lands (P2-B1.2 #108).
      expect(event.at - sentAt).toBeLessThan(1000);
      gateway.close();

      const list = (
        await binh.get(`/servers/${server.id}/channels`).expect(200)
      ).body as ChannelResponse[];
      expect(list.find((c) => c.id === server.text.id)?.last_message_id).toBe(
        message.id,
      );
    });

    it('MESSAGE_CREATE skips a member who cannot view the channel (ROLE-03)', async () => {
      const [an, dung] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, dung);
      const secret = (
        await an
          .post(ChannelRoutes.list.replace(':id', server.id))
          .send({ type: 'text', name: 'ban-can-su', viewer_role_ids: [] })
          .expect(201)
      ).body as ChannelResponse;
      const gateway = await connectGateway(app, dung.token);
      const hidden = (await send(an, secret.id, 'Họp cán sự').expect(201))
        .body as MessageResponse;
      const seen = (await send(an, server.text.id, 'Chào cả nhóm').expect(201))
        .body as MessageResponse;
      await gateway.next(
        'MESSAGE_CREATE',
        (d) => (d as MessageCreateEvent).id === seen.id,
      );
      expect(
        gateway.dispatches.some(
          (x) =>
            x.t === 'MESSAGE_CREATE' &&
            (x.d as MessageCreateEvent).id === hidden.id,
        ),
      ).toBe(false);
      gateway.close();

      for (const res of [
        await send(dung, secret.id, 'Cho mình vào với'),
        await dung.get(messagesOf(secret.id)),
      ])
        expect(res.body.code).toBe(ErrorCode.NotFound);
    });

    it('AC2 + AC3: empty, blank and 2001 characters are 40001; text is saved NFC', async () => {
      const an = await signedIn();
      const { text } = await serverOf(an);
      for (const content of ['', '   \n', 'a'.repeat(2001)]) {
        const res = await send(an, text.id, content);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe(ErrorCode.ValidationError);
      }
      const decomposed = 'Giải tích'.normalize('NFD');
      const res = await send(an, text.id, decomposed).expect(201);
      expect(res.body.content).toBe('Giải tích'.normalize('NFC'));
      await send(an, text.id, 'ệ'.repeat(2000).normalize('NFD')).expect(201);
    });

    it('AC4: viewing without SEND_MESSAGES is 40302; a member allow lets them send (ROLE-03 / #67 AC1)', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      // v1.7: a channel following its category takes no overwrites of its own.
      await an
        .patch(ChannelRoutes.byId.replace(':id', server.text.id))
        .send({ permissions_synced: false })
        .expect(200);
      await an
        .put(permission(server.text.id, server.id))
        .send({
          target_type: 'role',
          allow: '0',
          deny: P.SEND_MESSAGES.toString(),
        })
        .expect(200);
      const denied = await send(binh, server.text.id, 'Mình hỏi chút');
      expect(denied.status).toBe(403);
      expect(denied.body.code).toBe(ErrorCode.Forbidden);
      expect((await binh.get(messagesOf(server.text.id))).status).toBe(200);

      await an
        .put(permission(server.text.id, binh.id))
        .send({
          target_type: 'member',
          allow: P.SEND_MESSAGES.toString(),
          deny: '0',
        })
        .expect(200);
      await send(binh, server.text.id, 'Giờ thì gửi được').expect(201);
    });

    it('not a member, a voice channel or a DM is 40401', async () => {
      const [an, chi] = [await signedIn(), await signedIn()];
      const server = await serverOf(an);
      const dm = app.get(SnowflakeGenerator).next();
      await db.insert(channels).values({ id: dm, type: 3 });
      for (const res of [
        await send(chi, server.text.id, 'Xin chào'),
        await send(an, server.voice.id, 'Xin chào'),
        await send(an, dm.toString(), 'Xin chào'),
        await send(an, '123', 'Xin chào'),
      ])
        expect(res.body.code).toBe(ErrorCode.NotFound);
    });
  });

  describe('REQ-MSG-09', () => {
    it('AC1: the same nonce three times is one message, three times the same id', async () => {
      const an = await signedIn();
      const { text } = await serverOf(an);
      const n = nonce();
      const ids: string[] = [];
      for (let i = 0; i < 3; i++)
        ids.push(
          (await send(an, text.id, 'Mạng chập chờn', n).expect(201)).body.id,
        );
      const raced = await Promise.all(
        [1, 2, 3].map(() => send(an, text.id, 'Mạng chập chờn', n)),
      );
      ids.push(...raced.map((r) => r.body.id as string));
      expect(new Set(ids).size).toBe(1);
      const rows = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.channelId, BigInt(text.id)));
      expect(rows).toHaveLength(1);
    });

    it('the same nonce for another text is 40907', async () => {
      const an = await signedIn();
      const { text } = await serverOf(an);
      const n = nonce();
      await send(an, text.id, 'Bản đầu', n).expect(201);
      const res = await send(an, text.id, 'Bản khác', n);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe(ErrorCode.IdempotencyKeyReused);
    });

    it('AC2: Idempotency-Key replays the first result; another body is 40907', async () => {
      const an = await signedIn();
      const key = randomUUID();
      const first = await an
        .post('/e2e-idempotent')
        .set(IDEMPOTENCY_KEY_HEADER, key)
        .send({ title: 'Ôn chương 3' })
        .expect(201);
      const again = await an
        .post('/e2e-idempotent')
        .set(IDEMPOTENCY_KEY_HEADER, key)
        .send({ title: 'Ôn chương 3' })
        .expect(201);
      expect(again.body).toEqual(first.body);
      const other = await an
        .post('/e2e-idempotent')
        .set(IDEMPOTENCY_KEY_HEADER, key)
        .send({ title: 'Ôn chương 4' });
      expect(other.status).toBe(409);
      expect(other.body.code).toBe(ErrorCode.IdempotencyKeyReused);
    });
  });

  describe('REQ-SEARCH-02', () => {
    // 120 messages straight in the DB, oldest first.
    const seeded = async (an: Me, channelId: string) => {
      const ids = app.get(SnowflakeGenerator);
      const rows = Array.from({ length: 120 }, (_, i) => ({
        id: ids.next(),
        channelId: BigInt(channelId),
        authorId: an.userId,
        content: `Tin ${i + 1}`,
      }));
      await db.insert(messages).values(rows);
      return rows.map((r) => r.id.toString());
    };
    const idsOf = (body: MessageResponse[]) => body.map((m) => m.id);

    it('AC1: before=<id>&limit=50 is exactly the 50 before it, even while others send', async () => {
      const an = await signedIn();
      const { text } = await serverOf(an);
      const all = await seeded(an, text.id);
      const page = an.get(`${messagesOf(text.id)}?before=${all[100]}&limit=50`);
      const [res] = await Promise.all([
        page,
        send(an, text.id, 'Chen giữa lúc tải'),
      ]);
      expect(idsOf(res.body)).toEqual(all.slice(50, 100));
      const older = await an
        .get(`${messagesOf(text.id)}?before=${all[50]}&limit=50`)
        .expect(200);
      expect(idsOf(older.body)).toEqual(all.slice(0, 50));
    });

    it('no cursor is the newest 50; after and around keep the order', async () => {
      const an = await signedIn();
      const { text } = await serverOf(an);
      const all = await seeded(an, text.id);
      expect(idsOf((await an.get(messagesOf(text.id))).body)).toEqual(
        all.slice(70),
      );
      expect(
        idsOf(
          (await an.get(`${messagesOf(text.id)}?after=${all[9]}&limit=5`)).body,
        ),
      ).toEqual(all.slice(10, 15));
      expect(
        idsOf(
          (await an.get(`${messagesOf(text.id)}?around=${all[60]}&limit=5`))
            .body,
        ),
      ).toEqual(all.slice(58, 63));
    });

    it('AC2: limit=500 and two cursors at once are 40001', async () => {
      const an = await signedIn();
      const { text } = await serverOf(an);
      for (const query of ['limit=500', 'before=1&after=2']) {
        const res = await an.get(`${messagesOf(text.id)}?${query}`);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe(ErrorCode.ValidationError);
      }
    });
  });
});
