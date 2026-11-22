import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  InviteRoutes,
  MessageRoutes,
  ServerRoutes,
  mentionToken,
  type MessageResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { messages } from '../src/modules/messaging/messages.schema.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
import {
  ChannelTypeCode,
  channels,
  roles,
  serverMemberRoles,
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

const messagesOf = (channelId: string) =>
  MessageRoutes.list.replace(':id', channelId);

// The listener runs after the 201: wait for what it writes.
async function eventually<T>(read: () => Promise<T>, ok: (v: T) => boolean) {
  for (let i = 0; i < 40; i++) {
    const v = await read();
    if (ok(v)) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  return read();
}
const settle = () => new Promise((r) => setTimeout(r, 300));

// REQ-MSG-03, MSG-08, MSG-11 with Postgres and Redis. Needs `pnpm dev:infra`.
describe('Mentions, rate limit, system messages (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let ids: SnowflakeGenerator;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    db = app.get(DB);
    ids = app.get(SnowflakeGenerator);
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
      patch: (path: string) => api.patch(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An (Owner, so MENTION_EVERYONE) and members in a general server.
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
    return { id: server.id, text, welcome: server.system_channel_id };
  };

  const role = async (serverId: string, mentionable: boolean, ...who: Me[]) => {
    const id = ids.next();
    await db.insert(roles).values({
      id,
      serverId: BigInt(serverId),
      name: 'Trưởng nhóm',
      position: 1,
      isMentionable: mentionable,
    });
    if (who.length)
      await db.insert(serverMemberRoles).values(
        who.map((m) => ({
          serverId: BigInt(serverId),
          userId: m.userId,
          roleId: id,
        })),
      );
    return String(id);
  };

  const send = (me: Me, channelId: string, content: string) =>
    me.post(messagesOf(channelId)).send({ content, nonce: randomUUID() });

  const mentionsOf = (userId: bigint, messageId: string) =>
    db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, 'mention'),
        ),
      )
      .then((rows) =>
        rows.filter(
          (r) => (r.data as { message_id: string }).message_id === messageId,
        ),
      );

  describe('REQ-MSG-03', () => {
    it('AC2: @An → saved as mentioned, An gets one `mention` item', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const res = await send(
        binh,
        server.text.id,
        `${mentionToken.user(an.id)} tối nay ôn tiếp nhé`,
      ).expect(201);
      const m = res.body as MessageResponse;
      expect(m.mention_user_ids).toEqual([an.id]);
      const items = await eventually(
        () => mentionsOf(an.userId, m.id),
        (r) => r.length > 0,
      );
      expect(items).toHaveLength(1);
      expect(items[0]!.data).toMatchObject({
        actor_id: binh.id,
        server_id: server.id,
        channel_id: server.text.id,
        via: 'user',
      });
    });

    it('AC1: @everyone without MENTION_EVERYONE stays text, no items, no error', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const res = await send(binh, server.text.id, '@everyone ơi').expect(201);
      const m = res.body as MessageResponse;
      expect(m.content).toBe('@everyone ơi');
      expect(m.mention_everyone).toBe(false);
      await settle();
      expect(await mentionsOf(an.userId, m.id)).toEqual([]);
    });

    it('@user + @role + @everyone → one item each, none for the sender', async () => {
      const [an, binh, chi] = [
        await signedIn(),
        await signedIn(),
        await signedIn(),
      ];
      const server = await serverOf(an, binh, chi);
      const roleId = await role(server.id, true, an, binh);
      const res = await send(
        an,
        server.text.id,
        `${mentionToken.user(binh.id)} ${mentionToken.role(roleId)} @everyone`,
      ).expect(201);
      const m = res.body as MessageResponse;
      expect(m.mention_role_ids).toEqual([roleId]);
      expect(m.mention_everyone).toBe(true);
      const binhItems = await eventually(
        () => mentionsOf(binh.userId, m.id),
        (r) => r.length > 0,
      );
      const chiItems = await eventually(
        () => mentionsOf(chi.userId, m.id),
        (r) => r.length > 0,
      );
      expect(binhItems.map((r) => (r.data as { via: string }).via)).toEqual([
        'user',
      ]);
      expect(chiItems.map((r) => (r.data as { via: string }).via)).toEqual([
        'everyone',
      ]);
      expect(await mentionsOf(an.userId, m.id)).toEqual([]);
    });

    it('a role that is not mentionable needs MENTION_EVERYONE', async () => {
      const [an, binh, chi] = [
        await signedIn(),
        await signedIn(),
        await signedIn(),
      ];
      const server = await serverOf(an, binh, chi);
      const roleId = await role(server.id, false, chi);
      const byBinh = (
        await send(binh, server.text.id, mentionToken.role(roleId)).expect(201)
      ).body as MessageResponse;
      expect(byBinh.mention_role_ids).toEqual([]);
      const byAn = (
        await send(an, server.text.id, mentionToken.role(roleId)).expect(201)
      ).body as MessageResponse;
      expect(byAn.mention_role_ids).toEqual([roleId]);
      const items = await eventually(
        () => mentionsOf(chi.userId, byAn.id),
        (r) => r.length > 0,
      );
      expect(items[0]!.data).toMatchObject({ via: 'role', role_id: roleId });
    });

    it('someone outside the server is not mentioned', async () => {
      const [an, stranger] = [await signedIn(), await signedIn()];
      const server = await serverOf(an);
      const m = (
        await send(an, server.text.id, mentionToken.user(stranger.id)).expect(
          201,
        )
      ).body as MessageResponse;
      expect(m.mention_user_ids).toEqual([]);
    });
  });

  describe('REQ-MSG-08', () => {
    it('AC1: the 6th in 5 seconds in a channel → 40029 with Retry-After, not counted', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      for (let i = 0; i < 5; i++)
        await send(an, server.text.id, `tin ${i}`).expect(201);
      const res = await send(an, server.text.id, 'tin 6').expect(429);
      expect((res.body as { code: number }).code).toBe(ErrorCode.RateLimited);
      const after = Number(res.headers['retry-after']);
      expect(after).toBeGreaterThanOrEqual(1);
      expect(after).toBeLessThanOrEqual(5);
    });

    it('AC1: the 31st in a minute across channels → 40029', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const extra = Array.from({ length: 6 }, () => ids.next());
      await db.insert(channels).values(
        extra.map((id, i) => ({
          id,
          serverId: BigInt(server.id),
          type: ChannelTypeCode.text,
          name: `kenh-${i}`,
          position: 10 + i,
        })),
      );
      for (const id of extra)
        for (let i = 0; i < 5; i++)
          await send(an, String(id), `tin ${i}`).expect(201);
      const res = await send(an, server.text.id, 'tin 31').expect(429);
      expect((res.body as { code: number }).code).toBe(ErrorCode.RateLimited);
    });
  });

  describe('REQ-MSG-11', () => {
    const join = async (an: Me) => {
      const server = await serverOf(an);
      const invite = (
        await an
          .post(InviteRoutes.create.replace(':id', server.text.id))
          .send({})
          .expect(201)
      ).body as { code: string };
      return { server, code: invite.code };
    };

    it('SRV-04 AC1: joining posts member_join in the welcome channel, no mention item', async () => {
      const an = await signedIn();
      const { server, code } = await join(an);
      const dung = await signedIn();
      await dung.post(InviteRoutes.accept.replace(':code', code)).expect(200);
      const rows = await eventually(
        () =>
          db
            .select()
            .from(messages)
            .where(eq(messages.channelId, BigInt(server.welcome!))),
        (r) => r.length > 0,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        type: 1,
        authorId: dung.userId,
        systemData: { user_id: dung.id },
      });
      await settle();
      expect(await mentionsOf(an.userId, String(rows[0]!.id))).toEqual([]);
    });

    it('AC4: "Không gửi" (no welcome channel) → no message', async () => {
      const an = await signedIn();
      const { server, code } = await join(an);
      await db
        .update(servers)
        .set({ systemChannelId: null })
        .where(eq(servers.id, BigInt(server.id)));
      await (
        await signedIn()
      )
        .post(InviteRoutes.accept.replace(':code', code))
        .expect(200);
      await settle();
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.channelId, BigInt(server.text.id)));
      expect(rows).toEqual([]);
    });
  });
});
