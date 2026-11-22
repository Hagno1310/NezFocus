import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  InviteRoutes,
  MessageRoutes,
  ServerRoutes,
  mentionToken,
  type MessageAck,
  type MessageResponse,
  type Ready,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import { readStates } from '../src/modules/messaging/messages.schema.js';
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

const ackPath = (channelId: string, messageId: string) =>
  MessageRoutes.ack.replace(':id', channelId).replace(':messageId', messageId);

async function eventually<T>(read: () => Promise<T>, ok: (v: T) => boolean) {
  for (let i = 0; i < 40; i++) {
    const v = await read();
    if (ok(v)) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  return read();
}

// REQ-NOTIF-01 read state with Postgres, Redis and the Gateway. Needs `pnpm dev:infra`.
describe('Read states (e2e)', () => {
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
      post: (path: string) => api.post(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

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
    return {
      id: server.id,
      text: server.channels.find((c) => c.type === 'text')!,
    };
  };

  const send = async (me: Me, channelId: string, content: string) =>
    (
      await me
        .post(MessageRoutes.list.replace(':id', channelId))
        .send({ content, nonce: randomUUID() })
        .expect(201)
    ).body as MessageResponse;

  const stateOf = (userId: bigint, channelId: string) =>
    db
      .select()
      .from(readStates)
      .where(
        and(
          eq(readStates.userId, userId),
          eq(readStates.channelId, BigInt(channelId)),
        ),
      )
      .then((r) => r[0]);

  it('NOTIF-01 AC2: a mention → +1 once however it is made; ack clears it', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const server = await serverOf(an, binh);
    const m = await send(
      an,
      server.text.id,
      `${mentionToken.user(binh.id)} @everyone`,
    );
    const s = await eventually(
      () => stateOf(binh.userId, server.text.id),
      (r) => (r?.mentionCount ?? 0) > 0,
    );
    expect(s!.mentionCount).toBe(1);

    await binh.post(ackPath(server.text.id, m.id)).expect(204);
    expect(await stateOf(binh.userId, server.text.id)).toMatchObject({
      lastReadMessageId: BigInt(m.id),
      mentionCount: 0,
    });
  });

  it('AC1: ack reaches my other session as MESSAGE_ACK within 2 s; an older ack does not move back', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const server = await serverOf(an, binh);
    const first = await send(
      an,
      server.text.id,
      `${mentionToken.user(binh.id)} 1`,
    );
    const second = await send(
      an,
      server.text.id,
      `${mentionToken.user(binh.id)} 2`,
    );
    await eventually(
      () => stateOf(binh.userId, server.text.id),
      (r) => r?.mentionCount === 2,
    );
    const phoneB = await connectGateway(app, binh.token);

    const at = Date.now();
    await binh.post(ackPath(server.text.id, first.id)).expect(204);
    const ack = await phoneB.next('MESSAGE_ACK');
    expect(ack.at - at).toBeLessThan(2000);
    // One mention after `first` is still unread.
    expect(ack.d as MessageAck).toEqual({
      channel_id: server.text.id,
      message_id: first.id,
      mention_count: 1,
    });

    await binh.post(ackPath(server.text.id, second.id)).expect(204);
    await binh.post(ackPath(server.text.id, first.id)).expect(204);
    expect(await stateOf(binh.userId, server.text.id)).toMatchObject({
      lastReadMessageId: BigInt(second.id),
      mentionCount: 0,
    });
    phoneB.close();
  });

  it('my own message marks the channel read for me', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const server = await serverOf(an, binh);
    await send(binh, server.text.id, mentionToken.user(an.id));
    const mine = await send(an, server.text.id, 'Ok');
    const s = await eventually(
      () => stateOf(an.userId, server.text.id),
      (r) => r?.lastReadMessageId === BigInt(mine.id),
    );
    expect(s).toMatchObject({
      lastReadMessageId: BigInt(mine.id),
      mentionCount: 0,
    });
  });

  it('ack of a channel I cannot see, or a message not in it → 40401, nothing changes', async () => {
    const [an, binh, chi] = [
      await signedIn(),
      await signedIn(),
      await signedIn(),
    ];
    const server = await serverOf(an, binh);
    const m = await send(an, server.text.id, 'Chào');
    const res = await chi.post(ackPath(server.text.id, m.id)).expect(404);
    expect((res.body as { code: number }).code).toBe(ErrorCode.NotFound);
    expect(await stateOf(chi.userId, server.text.id)).toBeUndefined();

    const other = await serverOf(an);
    const elsewhere = await send(an, other.text.id, 'Khác');
    await binh.post(ackPath(server.text.id, elsewhere.id)).expect(404);
  });

  it('READY: one read state per channel I can view, with server and last message', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const server = await serverOf(an, binh);
    const m = await send(
      an,
      server.text.id,
      `${mentionToken.user(binh.id)} chào`,
    );
    await eventually(
      () => stateOf(binh.userId, server.text.id),
      (r) => r?.mentionCount === 1,
    );
    const gw = await connectGateway(app, binh.token);
    const ready = gw.ready() as Ready;
    expect(ready.read_states).toContainEqual({
      channel_id: server.text.id,
      server_id: server.id,
      last_read_message_id: null,
      last_message_id: m.id,
      mention_count: 1,
    });
    gw.close();
  });

  it('joining by invite: what was there before counts as read (chốt 22/11/2026)', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    const old = await send(an, server.text.id, 'Tin cũ');
    const invite = (
      await an
        .post(InviteRoutes.create.replace(':id', server.text.id))
        .send({})
        .expect(201)
    ).body as { code: string };
    const dung = await signedIn();
    await dung
      .post(InviteRoutes.accept.replace(':code', invite.code))
      .expect(200);
    // The general template's text channel is the welcome channel: Dũng's own join message
    // comes after the old one, and is read for him too.
    const s = await eventually(
      () => stateOf(dung.userId, server.text.id),
      (r) => !!r && r.lastReadMessageId > BigInt(old.id),
    );
    expect(s!.lastReadMessageId > BigInt(old.id)).toBe(true);
    expect(s!.mentionCount).toBe(0);
  });
});
