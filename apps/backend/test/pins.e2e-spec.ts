import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  DmRoutes,
  ErrorCode,
  MAX_PINS,
  MessageRoutes,
  Permission as P,
  RelationshipRoutes,
  ServerRoutes,
  type ChannelPinsUpdateEvent,
  type DmChannel,
  type MessageResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import {
  FriendshipStatus,
  friendships,
} from '../src/modules/friends/friends.schema.js';
import { messages } from '../src/modules/messaging/messages.schema.js';
import { MessagesService } from '../src/modules/messaging/messages.service.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import {
  roles,
  serverMemberRoles,
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
const pinsOf = (channelId: string) =>
  MessageRoutes.pins.replace(':id', channelId);
const pinPath = (channelId: string, messageId: string) =>
  MessageRoutes.pin.replace(':id', channelId).replace(':messageId', messageId);
const messagePath = (channelId: string, messageId: string) =>
  MessageRoutes.message
    .replace(':id', channelId)
    .replace(':messageId', messageId);

// REQ-MSG-10 (AC1–AC4), MSG-11, CR-28 #28. Needs `pnpm dev:infra`.
describe('Pins (e2e)', () => {
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
      del: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An owns the server (MANAGE_MESSAGES); the others are plain members.
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
    const text = server.channels.find((c) => c.type === 'text')!;
    return { id: server.id, text: text.id };
  };

  const dmOf = async (a: Me, b: Me) => {
    const [low, high] = a.userId < b.userId ? [a, b] : [b, a];
    await db.insert(friendships).values({
      userIdLow: low.userId,
      userIdHigh: high.userId,
      status: FriendshipStatus.accepted,
      requestedBy: a.userId,
    });
    return (
      (await a.post(DmRoutes.create).send({ recipient_id: b.id }).expect(200))
        .body as DmChannel
    ).id;
  };

  const send = async (me: Me, channelId: string, content: string) =>
    (
      await me
        .post(messagesOf(channelId))
        .send({ content, nonce: randomUUID() })
        .expect(201)
    ).body as MessageResponse;

  const pins = async (me: Me, channelId: string) =>
    (await me.get(pinsOf(channelId)).expect(200)).body as MessageResponse[];

  const history = async (me: Me, channelId: string) =>
    (await me.get(messagesOf(channelId)).expect(200)).body as MessageResponse[];

  const code = (res: { body: { code?: number } }) => res.body.code;

  // A "Điều phối" role with MANAGE_MESSAGES for `me`.
  const moderator = async (serverId: string, me: Me) => {
    const roleId = app.get(SnowflakeGenerator).next();
    await db.insert(roles).values({
      id: roleId,
      serverId: BigInt(serverId),
      name: 'Điều phối',
      permissions: P.VIEW_CHANNEL | P.SEND_MESSAGES | P.MANAGE_MESSAGES,
      position: 1,
    });
    await db.insert(serverMemberRoles).values({
      serverId: BigInt(serverId),
      userId: me.userId,
      roleId,
    });
    await app.get(PermissionCache).invalidateServer(BigInt(serverId));
  };

  it('AC1: pin → CHANNEL_PINS_UPDATE, in the list, "An đã ghim một tin nhắn"; pinning again changes nothing', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const server = await serverOf(an, binh);
    const sent = await send(binh, server.text, 'Lời giải đề giữa kỳ 2024');
    const gateway = await connectGateway(app, binh.token);
    await an.put(pinPath(server.text, sent.id)).expect(204);
    const event = await gateway.next(
      'CHANNEL_PINS_UPDATE',
      (d) => (d as ChannelPinsUpdateEvent).message_id === sent.id,
    );
    gateway.close();
    expect(event.d).toMatchObject({
      channel_id: server.text,
      server_id: server.id,
      message_id: sent.id,
      pinned_at: expect.any(String),
    });
    const listed = await pins(binh, server.text);
    expect(listed.map((m) => m.id)).toEqual([sent.id]);
    expect(listed[0]!.pinned_at).not.toBeNull();

    const system = (await history(binh, server.text)).filter(
      (m) => m.type === 'channel_pinned',
    );
    expect(system).toHaveLength(1);
    expect(system[0]).toMatchObject({
      author: { id: an.id },
      system_data: { message_id: sent.id },
    });

    await an.put(pinPath(server.text, sent.id)).expect(204);
    expect(
      (await history(binh, server.text)).filter(
        (m) => m.type === 'channel_pinned',
      ),
    ).toHaveLength(1);
  });

  it('newest pin first; unpin → pinned_at null on the event, gone, no system message (CR-28 #28)', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    const first = await send(an, server.text, 'Một');
    const second = await send(an, server.text, 'Hai');
    await an.put(pinPath(server.text, first.id)).expect(204);
    await an.put(pinPath(server.text, second.id)).expect(204);
    expect((await pins(an, server.text)).map((m) => m.id)).toEqual([
      second.id,
      first.id,
    ]);
    const gateway = await connectGateway(app, an.token);
    await an.del(pinPath(server.text, second.id)).expect(204);
    const event = await gateway.next(
      'CHANNEL_PINS_UPDATE',
      (d) => (d as ChannelPinsUpdateEvent).message_id === second.id,
    );
    gateway.close();
    expect((event.d as ChannelPinsUpdateEvent).pinned_at).toBeNull();
    expect((await pins(an, server.text)).map((m) => m.id)).toEqual([first.id]);
    expect(
      (await history(an, server.text)).filter(
        (m) => m.type === 'channel_pinned',
      ),
    ).toHaveLength(2);
    await an.del(pinPath(server.text, second.id)).expect(204);
  });

  it('AC2 (âm): with 50 pinned the 51st → 40904; a deleted pin leaves the list and frees a place', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    // Straight into the table: 50 sends would hit REQ-MSG-08's limit.
    const ids = app.get(SnowflakeGenerator);
    const many = Array.from({ length: MAX_PINS }, () => ids.next());
    await db.insert(messages).values(
      many.map((id, i) => ({
        id,
        channelId: BigInt(server.text),
        authorId: an.userId,
        content: `Ghim ${i}`,
        pinnedAt: new Date(),
        pinnedBy: an.userId,
      })),
    );
    const one = await send(an, server.text, 'Tin thứ 51');
    const res = await an.put(pinPath(server.text, one.id)).expect(409);
    expect(code(res)).toBe(ErrorCode.MaxPinsReached);

    await an.del(messagePath(server.text, many[0]!.toString())).expect(204);
    expect(await pins(an, server.text)).toHaveLength(MAX_PINS - 1);
    await an.put(pinPath(server.text, one.id)).expect(204);
  });

  it('AC3 (âm): in a server without MANAGE_MESSAGES → 40302; a moderator role may', async () => {
    const [an, binh, chi] = [
      await signedIn(),
      await signedIn(),
      await signedIn(),
    ];
    const server = await serverOf(an, binh, chi);
    const sent = await send(an, server.text, 'Lịch ôn tập');
    expect(code(await binh.put(pinPath(server.text, sent.id)))).toBe(
      ErrorCode.Forbidden,
    );
    await moderator(server.id, chi);
    await chi.put(pinPath(server.text, sent.id)).expect(204);
    expect(code(await binh.del(pinPath(server.text, sent.id)))).toBe(
      ErrorCode.Forbidden,
    );
  });

  it('CR-28 #28: a timed-out moderator cannot pin', async () => {
    const [an, chi] = [await signedIn(), await signedIn()];
    const server = await serverOf(an, chi);
    await moderator(server.id, chi);
    const sent = await send(an, server.text, 'Tin');
    await db
      .update(serverMembers)
      .set({ timeoutUntil: new Date(Date.now() + 60 * 60_000) })
      .where(
        and(
          eq(serverMembers.serverId, BigInt(server.id)),
          eq(serverMembers.userId, chi.userId),
        ),
      );
    await app.get(PermissionCache).invalidateServer(BigInt(server.id));
    expect(code(await chi.put(pinPath(server.text, sent.id)))).toBe(
      ErrorCode.Forbidden,
    );
  });

  it('CR-28 #28: a system message is not pinned (40302); a message of another channel or gone → 40401', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    const other = await serverOf(an);
    const system = await app
      .get(MessagesService)
      .createSystemMessage(BigInt(server.text), an.userId, 'member_join', {
        user_id: an.id,
      });
    expect(code(await an.put(pinPath(server.text, system.id)))).toBe(
      ErrorCode.Forbidden,
    );
    const elsewhere = await send(an, other.text, 'Ở kênh khác');
    await an.put(pinPath(server.text, elsewhere.id)).expect(404);
    const gone = await send(an, server.text, 'Sẽ xóa');
    await an.del(messagePath(server.text, gone.id)).expect(204);
    await an.put(pinPath(server.text, gone.id)).expect(404);
  });

  it('AC4: in a DM either person pins (no MANAGE_MESSAGES); blocked → 40303', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const dm = await dmOf(an, binh);
    const sent = await send(an, dm, 'Địa chỉ thư viện');
    await binh.put(pinPath(dm, sent.id)).expect(204);
    expect((await pins(an, dm)).map((m) => m.id)).toEqual([sent.id]);
    await an
      .put(RelationshipRoutes.byUser.replace(':userId', binh.id))
      .send({ type: 'blocked' })
      .expect(200);
    expect(code(await binh.del(pinPath(dm, sent.id)))).toBe(
      ErrorCode.CannotMessageUser,
    );
  });

  it('a channel I cannot view → 40401 for the list too', async () => {
    const [an, out] = [await signedIn(), await signedIn()];
    const server = await serverOf(an);
    await out.get(pinsOf(server.text)).expect(404);
  });
});
