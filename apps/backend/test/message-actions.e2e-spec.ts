import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  DmRoutes,
  ErrorCode,
  MessageRoutes,
  Permission as P,
  RelationshipRoutes,
  ServerRoutes,
  type DmChannel,
  type MessageDeleteEvent,
  type MessageReactionEvent,
  type MessageResponse,
  type MessageUpdateEvent,
  type ReactionUsersResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import {
  FriendshipStatus,
  friendships,
} from '../src/modules/friends/friends.schema.js';
import {
  messageReactions,
  readStates,
} from '../src/modules/messaging/messages.schema.js';
import { MessagesService } from '../src/modules/messaging/messages.service.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
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

const messagesOf = (channelId: string) =>
  MessageRoutes.list.replace(':id', channelId);
const messagePath = (channelId: string, messageId: string) =>
  MessageRoutes.message
    .replace(':id', channelId)
    .replace(':messageId', messageId);
const myReaction = (channelId: string, messageId: string, emoji: string) =>
  MessageRoutes.myReaction
    .replace(':id', channelId)
    .replace(':messageId', messageId)
    .replace(':emoji', encodeURIComponent(emoji));
const reactionUsers = (channelId: string, messageId: string, emoji: string) =>
  MessageRoutes.reaction
    .replace(':id', channelId)
    .replace(':messageId', messageId)
    .replace(':emoji', encodeURIComponent(emoji));

const EMOJI = [...'😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤩'];

// REQ-MSG-05 (sửa / xóa / trả lời / reaction), MSG-03 AC3–5, MSG-11 AC2, CR-28 #25–#27.
// Needs `pnpm dev:infra`.
describe('Message actions (e2e)', () => {
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

  const send = async (
    me: Me,
    channelId: string,
    content: string,
    extra: { reply_to_id?: string } = {},
  ) =>
    (
      await me
        .post(messagesOf(channelId))
        .send({ content, nonce: randomUUID(), ...extra })
        .expect(201)
    ).body as MessageResponse;

  const history = async (me: Me, channelId: string) =>
    (await me.get(messagesOf(channelId)).expect(200)).body as MessageResponse[];

  const timeOut = async (serverId: string, me: Me) => {
    await db
      .update(serverMembers)
      .set({ timeoutUntil: new Date(Date.now() + 60 * 60_000) })
      .where(
        and(
          eq(serverMembers.serverId, BigInt(serverId)),
          eq(serverMembers.userId, me.userId),
        ),
      );
    await app.get(PermissionCache).invalidateServer(BigInt(serverId));
  };

  const expectCode = (
    res: { status: number; body: { code?: number } },
    code: ErrorCode,
  ) => expect(res.body.code).toBe(code);

  const itemsOf = (userId: bigint, messageId: string) =>
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .then((rows) =>
        rows.filter(
          (r) => (r.data as { message_id?: string }).message_id === messageId,
        ),
      );

  describe('Sửa (AC1, AC2, MSG-11 AC2, CR-28 #27)', () => {
    it('AC1: the author edits → 200 with edited_at, MESSAGE_UPDATE to who can view', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, 'Mai học lúc 7h');
      const gateway = await connectGateway(app, an.token);
      const res = await binh
        .patch(messagePath(server.text, sent.id))
        .send({ content: 'Mai học lúc 8h' })
        .expect(200);
      const edited = res.body as MessageResponse;
      expect(edited.content).toBe('Mai học lúc 8h');
      expect(edited.edited_at).not.toBeNull();
      const event = await gateway.next(
        'MESSAGE_UPDATE',
        (d) => (d as MessageUpdateEvent).id === sent.id,
      );
      expect(event.d).toMatchObject({
        channel_id: server.text,
        server_id: server.id,
        content: 'Mai học lúc 8h',
        edited_at: edited.edited_at,
      });
      gateway.close();
      const [listed] = await history(an, server.text);
      expect(listed).toMatchObject({ content: 'Mai học lúc 8h' });
    });

    it('AC2 (âm): someone else edits → 40302, even with MANAGE_MESSAGES', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, 'Tin của Bình');
      const res = await an
        .patch(messagePath(server.text, sent.id))
        .send({ content: 'An sửa' });
      expect(res.status).toBe(403);
      expectCode(res, ErrorCode.Forbidden);
    });

    it('MSG-11 AC2 (âm): a system message cannot be edited → 40302', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const system = await app
        .get(MessagesService)
        .createSystemMessage(BigInt(server.text), binh.userId, 'member_join', {
          user_id: binh.id,
        });
      const res = await binh
        .patch(messagePath(server.text, system.id))
        .send({ content: 'đổi' });
      expectCode(res, ErrorCode.Forbidden);
    });

    it('timed out → cannot edit (40302 until P3-A3.1 #126); blank content → 40001', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, 'Tin cũ');
      const blank = await binh
        .patch(messagePath(server.text, sent.id))
        .send({ content: '  ' });
      expectCode(blank, ErrorCode.ValidationError);
      await timeOut(server.id, binh);
      const res = await binh
        .patch(messagePath(server.text, sent.id))
        .send({ content: 'Tin mới' });
      expectCode(res, ErrorCode.Forbidden);
    });

    it('CR-28 #27: a mention added by an edit shows, but makes no inbox item and no mention_count', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, 'Ai làm câu 3?');
      const edited = (
        await binh
          .patch(messagePath(server.text, sent.id))
          .send({ content: `Ai làm câu 3? <@${an.id}>` })
          .expect(200)
      ).body as MessageResponse;
      expect(edited.mention_user_ids).toEqual([an.id]);
      await new Promise((r) => setTimeout(r, 200));
      expect(await itemsOf(an.userId, sent.id)).toHaveLength(0);
      const [state] = await db
        .select()
        .from(readStates)
        .where(
          and(
            eq(readStates.userId, an.userId),
            eq(readStates.channelId, BigInt(server.text)),
          ),
        );
      expect(state?.mentionCount ?? 0).toBe(0);
    });

    it('a deleted message is 40401', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const sent = await send(an, server.text, 'Sẽ xóa');
      await an.del(messagePath(server.text, sent.id)).expect(204);
      const res = await an
        .patch(messagePath(server.text, sent.id))
        .send({ content: 'x' });
      expectCode(res, ErrorCode.NotFound);
    });
  });

  describe('Xóa (AC3, AC7, MSG-11)', () => {
    it('AC3: the author deletes → 204, MESSAGE_DELETE, gone from history and its inbox item goes', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, `Nhờ <@${an.id}> xem giúp`);
      await new Promise((r) => setTimeout(r, 200));
      expect(await itemsOf(an.userId, sent.id)).toHaveLength(1);
      const gateway = await connectGateway(app, an.token);
      await binh.del(messagePath(server.text, sent.id)).expect(204);
      const event = await gateway.next(
        'MESSAGE_DELETE',
        (d) => (d as MessageDeleteEvent).id === sent.id,
      );
      expect(event.d).toEqual({
        id: sent.id,
        channel_id: server.text,
        server_id: server.id,
      });
      gateway.close();
      expect((await history(an, server.text)).map((m) => m.id)).not.toContain(
        sent.id,
      );
      expect(await itemsOf(an.userId, sent.id)).toHaveLength(0);
      // Twice (two people at once, S-HOME-04 edge case): already gone.
      expectCode(
        await binh.del(messagePath(server.text, sent.id)),
        ErrorCode.NotFound,
      );
    });

    it('AC3: MANAGE_MESSAGES deletes another member’s message, whatever the role order', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, 'Bán đề thi 50k');
      await an.del(messagePath(server.text, sent.id)).expect(204);
    });

    it('AC3 (âm, ROLE-08 AC2): a member deletes someone else’s message → 40302', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(an, server.text, 'Tin của An');
      const res = await binh.del(messagePath(server.text, sent.id));
      expect(res.status).toBe(403);
      expectCode(res, ErrorCode.Forbidden);
    });

    it('CR-28 #27: a timed-out member still deletes their own message', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(binh, server.text, 'Lỡ gửi');
      await timeOut(server.id, binh);
      await binh.del(messagePath(server.text, sent.id)).expect(204);
    });

    it('MSG-11: a system message goes only with MANAGE_MESSAGES, not by the person it names', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const system = await app
        .get(MessagesService)
        .createSystemMessage(BigInt(server.text), binh.userId, 'member_join', {
          user_id: binh.id,
        });
      expectCode(
        await binh.del(messagePath(server.text, system.id)),
        ErrorCode.Forbidden,
      );
      await an.del(messagePath(server.text, system.id)).expect(204);
    });

    it('AC7 (âm): in a DM only the author deletes', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const dm = await dmOf(an, binh);
      const sent = await send(an, dm, 'Tin riêng');
      expectCode(await binh.del(messagePath(dm, sent.id)), ErrorCode.Forbidden);
      await an.del(messagePath(dm, sent.id)).expect(204);
    });
  });

  describe('Reaction (AC4, AC5, CR-28 #25, #26)', () => {
    it('AC5: put, count, me, idempotent, remove; events both ways; who reacted', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(an, server.text, 'Chốt lịch thứ 7 nhé');
      const gateway = await connectGateway(app, an.token);
      await binh.put(myReaction(server.text, sent.id, '👍')).expect(204);
      await an.put(myReaction(server.text, sent.id, '👍')).expect(204);
      await an.put(myReaction(server.text, sent.id, '👍')).expect(204);
      const added = await gateway.next(
        'MESSAGE_REACTION_ADD',
        (d) => (d as MessageReactionEvent).user_id === binh.id,
      );
      expect(added.d).toEqual({
        user_id: binh.id,
        channel_id: server.text,
        message_id: sent.id,
        server_id: server.id,
        emoji: '👍',
      });
      let [listed] = await history(an, server.text);
      expect(listed!.reactions).toEqual([{ emoji: '👍', count: 2, me: true }]);
      const users = (
        await binh.get(reactionUsers(server.text, sent.id, '👍')).expect(200)
      ).body as ReactionUsersResponse;
      expect(users.map((u) => u.id)).toEqual([binh.id, an.id]);

      await an.del(myReaction(server.text, sent.id, '👍')).expect(204);
      await gateway.next(
        'MESSAGE_REACTION_REMOVE',
        (d) => (d as MessageReactionEvent).user_id === an.id,
      );
      gateway.close();
      [listed] = await history(an, server.text);
      expect(listed!.reactions).toEqual([{ emoji: '👍', count: 1, me: false }]);
    });

    it('AC4 (âm): the 21st different emoji → 40905; adding to one already there still works', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(an, server.text, 'Thả cảm xúc đi');
      await db.insert(messageReactions).values(
        EMOJI.slice(0, 20).map((emoji) => ({
          messageId: BigInt(sent.id),
          emoji,
          userId: an.userId,
        })),
      );
      const res = await binh.put(myReaction(server.text, sent.id, '🎉'));
      expect(res.status).toBe(409);
      expectCode(res, ErrorCode.MaxReactionsReached);
      await binh.put(myReaction(server.text, sent.id, EMOJI[0]!)).expect(204);
    });

    it('a new emoji needs ADD_REACTIONS; an emoji already there does not', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      await an
        .patch(ChannelRoutes.byId.replace(':id', server.text))
        .send({ permissions_synced: false })
        .expect(200);
      await an
        .put(
          ChannelRoutes.permission
            .replace(':id', server.text)
            .replace(':targetId', server.id),
        )
        .send({
          target_type: 'role',
          allow: '0',
          deny: P.ADD_REACTIONS.toString(),
        })
        .expect(200);
      const sent = await send(an, server.text, 'Kênh chỉ đọc cảm xúc');
      await an.put(myReaction(server.text, sent.id, '❤️')).expect(204);
      expectCode(
        await binh.put(myReaction(server.text, sent.id, '😮')),
        ErrorCode.Forbidden,
      );
      await binh.put(myReaction(server.text, sent.id, '❤️')).expect(204);
    });

    it('timed out (ROLE-05) and system messages: no reaction → 40302', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const sent = await send(an, server.text, 'Tin');
      await an.put(myReaction(server.text, sent.id, '👍')).expect(204);
      const system = await app
        .get(MessagesService)
        .createSystemMessage(BigInt(server.text), binh.userId, 'member_join', {
          user_id: binh.id,
        });
      expectCode(
        await an.put(myReaction(server.text, system.id, '👋')),
        ErrorCode.Forbidden,
      );
      await timeOut(server.id, binh);
      expectCode(
        await binh.put(myReaction(server.text, sent.id, '👍')),
        ErrorCode.Forbidden,
      );
    });

    it('not one emoji → 40001; unknown message → 40401', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const sent = await send(an, server.text, 'Tin');
      expectCode(
        await an.put(myReaction(server.text, sent.id, 'ok')),
        ErrorCode.ValidationError,
      );
      expectCode(
        await an.put(myReaction(server.text, '1', '👍')),
        ErrorCode.NotFound,
      );
    });

    it('CR-28 #25: the 11th put / remove in 5 seconds → 40029 with Retry-After', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const sent = await send(an, server.text, 'Spam cảm xúc');
      for (let i = 0; i < 10; i++)
        await (i % 2 ? an.del : an.put)(
          myReaction(server.text, sent.id, '👍'),
        ).expect(204);
      const res = await an.put(myReaction(server.text, sent.id, '👍'));
      expect(res.status).toBe(429);
      expectCode(res, ErrorCode.RateLimited);
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('CR-28 #27: in a DM one cannot message, no reaction → 40303', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const dm = await dmOf(an, binh);
      const sent = await send(an, dm, 'Chào');
      await binh.put(myReaction(dm, sent.id, '👋')).expect(204);
      await an
        .put(RelationshipRoutes.byUser.replace(':userId', binh.id))
        .send({ type: 'blocked' })
        .expect(200);
      expectCode(
        await binh.put(myReaction(dm, sent.id, '❤️')),
        ErrorCode.CannotMessageUser,
      );
    });
  });

  describe('Trả lời (AC6, MSG-03 AC3–AC5)', () => {
    it('a reply carries the original; once it is deleted, referenced_message is null (AC6)', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const original = await send(an, server.text, 'Câu 3 làm sao vậy?');
      const reply = await send(binh, server.text, 'Dùng tích phân từng phần', {
        reply_to_id: original.id,
      });
      expect(reply.reply_to_id).toBe(original.id);
      expect(reply.referenced_message).toMatchObject({
        id: original.id,
        content: 'Câu 3 làm sao vậy?',
        author: { id: an.id },
      });
      await an.del(messagePath(server.text, original.id)).expect(204);
      const [listed] = await history(binh, server.text);
      expect(listed).toMatchObject({
        id: reply.id,
        reply_to_id: original.id,
        referenced_message: null,
      });
      // Replying to a message deleted meanwhile still sends (02 edge case).
      await send(an, server.text, 'Mình hỏi lại nhé', {
        reply_to_id: original.id,
      });
    });

    it('reply_to_id of another channel or of a system message → 40001', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const one = await serverOf(an, binh);
      const other = await serverOf(an);
      const elsewhere = await send(an, other.text, 'Ở server khác');
      const system = await app
        .get(MessagesService)
        .createSystemMessage(BigInt(one.text), binh.userId, 'member_join', {
          user_id: binh.id,
        });
      for (const id of [elsewhere.id, system.id, '1']) {
        const res = await an
          .post(messagesOf(one.text))
          .send({ content: 'trả lời', nonce: randomUUID(), reply_to_id: id });
        expectCode(res, ErrorCode.ValidationError);
      }
    });

    it('MSG-03 AC3: a reply to my message gives me one `reply` item and +1 mention_count; with @me, one `mention`', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const mine = await send(an, server.text, 'Ai có đề cương?');
      const reply = await send(binh, server.text, 'Mình có', {
        reply_to_id: mine.id,
      });
      const both = await send(binh, server.text, `<@${an.id}> đây nè`, {
        reply_to_id: mine.id,
      });
      await new Promise((r) => setTimeout(r, 200));
      expect((await itemsOf(an.userId, reply.id)).map((n) => n.type)).toEqual([
        'reply',
      ]);
      expect((await itemsOf(an.userId, both.id)).map((n) => n.type)).toEqual([
        'mention',
      ]);
      const [state] = await db
        .select()
        .from(readStates)
        .where(
          and(
            eq(readStates.userId, an.userId),
            eq(readStates.channelId, BigInt(server.text)),
          ),
        );
      expect(state!.mentionCount).toBe(2);
      // The ack recount (NOTIF-01) counts replies to me the same way.
      await an
        .post(
          MessageRoutes.ack
            .replace(':id', server.text)
            .replace(':messageId', mine.id),
        )
        .expect(204);
      const [after] = await db
        .select()
        .from(readStates)
        .where(
          and(
            eq(readStates.userId, an.userId),
            eq(readStates.channelId, BigInt(server.text)),
          ),
        );
      expect(after!.mentionCount).toBe(2);
    });

    it('MSG-03 AC4 + AC5 (âm): replying to myself, or in a DM, makes no item', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const mine = await send(an, server.text, 'Câu hỏi');
      const self = await send(an, server.text, 'Bổ sung', {
        reply_to_id: mine.id,
      });
      const dm = await dmOf(an, binh);
      const dmMine = await send(an, dm, 'Hỏi riêng');
      const dmReply = await send(binh, dm, 'Trả lời riêng', {
        reply_to_id: dmMine.id,
      });
      await new Promise((r) => setTimeout(r, 200));
      expect(await itemsOf(an.userId, self.id)).toHaveLength(0);
      expect(await itemsOf(an.userId, dmReply.id)).toHaveLength(0);
    });
  });
});
