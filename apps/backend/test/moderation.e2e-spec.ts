import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  BanRoutes,
  ErrorCode,
  InviteRoutes,
  MemberRoutes,
  MessageRoutes,
  Permission as P,
  RoleRoutes,
  ServerRoutes,
  toPermissionBitmap,
  type BanListResponse,
  type RoleResponse,
  type ServerMember,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { Clock } from '../src/common/clock.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import { ForegroundReader } from '../src/modules/gateway/foreground.js';
import { messages } from '../src/modules/messaging/messages.schema.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
import { AuditLogRepository } from '../src/modules/safety/audit-log.repository.js';
import { auditLogs } from '../src/modules/safety/audit-log.schema.js';
import {
  serverMemberRoles,
  serverMembers,
  servers,
} from '../src/modules/servers/servers.schema.js';
import { VoiceService } from '../src/modules/voice/voice.service.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

type Sent = { to: bigint; t: string; d: unknown };

// REQ-ROLE-05 / 07 / 09 (P3-A3.1 #126) through REST and Postgres. Needs `pnpm dev:infra`.
describe('Moderation (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let now = new Date('2026-10-18T13:12:00Z');
  let foreground = false;
  const sent: Sent[] = [];
  const disconnected: { userId: bigint; serverId: bigint; reason: string }[] =
    [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b
        .overrideProvider(EventPublisher)
        .useValue({
          toUser: async (to: bigint, t: string, d: unknown) =>
            void sent.push({ to, t, d }),
          toServer: async (to: bigint, t: string, d: unknown) =>
            void sent.push({ to, t: `server:${t}`, d }),
          toChannel: async (to: bigint, t: string, d: unknown) =>
            void sent.push({ to, t: `channel:${t}`, d }),
          toServerSubscribers: async () => {},
          toLogin: async () => {},
        })
        .overrideProvider(VoiceService)
        .useValue({
          disconnect: async (
            userId: bigint,
            scope: { serverId: bigint },
            reason: string,
          ) => {
            disconnected.push({ userId, serverId: scope.serverId, reason });
            return true;
          },
          seatOf: async () => null,
          occupants: async () => [],
          roomDeleted: async () => {},
        })
        .overrideProvider(ForegroundReader)
        .useValue({ inForeground: () => foreground })
        .overrideProvider(Clock)
        .useValue({ now: () => now }),
    ));
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    now = new Date('2026-10-18T13:12:00Z');
    foreground = false;
  });

  const signedIn = async (displayName: string) => {
    const username = uniqueUsername();
    const session = await signInWithCode(app, mailer, uniqueEmail());
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send({ ...completion(username), display_name: displayName })
      .expect(200);
    const auth = { type: 'bearer' as const };
    const api = http(app);
    const token = session.access_token;
    return {
      userId: BigInt(session.user.id),
      id: session.user.id,
      username,
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      patch: (path: string) => api.patch(path).auth(token, auth),
      put: (path: string) => api.put(path).auth(token, auth),
      delete: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // Spec 08: An owns; Quản trị (Tuấn: KICK, BAN, MODERATE) > Trưởng nhóm (Bình: MODERATE
  // only) > @everyone (Khánh, Quân). Lan is an admin role (ADMINISTRATOR) below Quản trị.
  const sampleServer = async () => {
    const [an, tuan, binh, khanh, quan, lan] = await Promise.all([
      signedIn('An'),
      signedIn('Tuấn'),
      signedIn('Bình'),
      signedIn('Khánh'),
      signedIn('Quân'),
      signedIn('Lan'),
    ]);
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    const serverId = BigInt(server.id);
    const create = async (name: string, permissions: bigint) => {
      const list = RoleRoutes.list.replace(':id', server.id);
      const made = (await an.post(list).send({ name }).expect(201))
        .body as RoleResponse;
      return (
        await an
          .patch(
            RoleRoutes.byId
              .replace(':id', server.id)
              .replace(':roleId', made.id),
          )
          .send({ permissions: toPermissionBitmap(permissions) })
          .expect(200)
      ).body as RoleResponse;
    };
    const admin = await create('Admin', P.ADMINISTRATOR);
    const truongNhom = await create('Trưởng nhóm', P.MODERATE_MEMBERS);
    const quanTri = await create(
      'Quản trị',
      P.KICK_MEMBERS | P.BAN_MEMBERS | P.MODERATE_MEMBERS,
    );
    for (const who of [tuan, binh, khanh, quan, lan])
      await db.insert(serverMembers).values({ serverId, userId: who.userId });
    const give = (who: Me, r: RoleResponse) =>
      db
        .insert(serverMemberRoles)
        .values({ serverId, userId: who.userId, roleId: BigInt(r.id) });
    await give(tuan, quanTri);
    await give(binh, truongNhom);
    await give(lan, admin);
    sent.length = 0;
    disconnected.length = 0;
    const member = (who: Me) =>
      MemberRoutes.member.replace(':id', server.id).replace(':userId', who.id);
    const ban = (who: Me) =>
      BanRoutes.one.replace(':id', server.id).replace(':userId', who.id);
    const text = server.channels.find((c) => c.type === 'text')!;
    return {
      ...{ an, tuan, binh, khanh, quan, lan },
      server,
      serverId,
      member,
      ban,
      bans: BanRoutes.list.replace(':id', server.id),
      text,
    };
  };

  const code = (res: { body: { code?: number } }) => res.body.code;
  const inMinutes = (m: number) =>
    new Date(now.getTime() + m * 60_000).toISOString();
  // Without the roles sampleServer made.
  const audit = async (serverId: bigint) =>
    (
      await db.select().from(auditLogs).where(eq(auditLogs.serverId, serverId))
    ).filter((e) => !e.actionType.startsWith('ROLE_'));
  const itemsOf = (who: Me) =>
    db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, who.userId),
          eq(notifications.type, 'moderation'),
        ),
      );
  const send = (who: Me, channelId: string, content = 'Bán đề thi') =>
    who
      .post(MessageRoutes.list.replace(':id', channelId))
      .send({ content, nonce: randomUUID() });

  describe('timeout (REQ-ROLE-05)', () => {
    it('1 giờ: the member shows it to everyone, the item has the end, the voice seat ends', async () => {
      const s = await sampleServer();
      const res = await s.binh
        .patch(s.member(s.quan))
        .send({ timeout_until: inMinutes(60), reason: 'Gửi tin liên tục' })
        .expect(200);
      expect(res.body as ServerMember).toMatchObject({
        timeout_until: '2026-10-18T14:12:00.000Z',
        timeout_reason: 'Gửi tin liên tục',
      });
      expect(sent).toContainEqual(
        expect.objectContaining({
          t: 'server:SERVER_MEMBER_UPDATE',
          d: expect.objectContaining({
            timeout_until: '2026-10-18T14:12:00.000Z',
          }),
        }),
      );
      // AC4: out of the room at once.
      expect(disconnected).toEqual([
        { userId: s.quan.userId, serverId: s.serverId, reason: 'timed_out' },
      ]);
      const [item] = await itemsOf(s.quan);
      expect(item!.data).toEqual({
        server_id: s.server.id,
        action: 'timeout',
        timeout_until: '2026-10-18T14:12:00.000Z',
        reason: 'Gửi tin liên tục',
      });
      expect(item!.readAt).toBeNull();
    });

    it('AC2 (âm): timed out → send 40307 with timeout_until, no reaction (40307); the voice token: voice.e2e-spec', async () => {
      const s = await sampleServer();
      const own = (await send(s.quan, s.text.id, 'trước').expect(201)).body as {
        id: string;
      };
      await s.binh
        .patch(s.member(s.quan))
        .send({ timeout_until: inMinutes(60) })
        .expect(200);
      const refused = await send(s.quan, s.text.id).expect(403);
      expect(refused.body).toMatchObject({
        code: ErrorCode.MemberTimedOut,
        timeout_until: '2026-10-18T14:12:00.000Z',
      });
      const react = await s.quan.put(
        MessageRoutes.myReaction
          .replace(':id', s.text.id)
          .replace(':messageId', own.id)
          .replace(':emoji', encodeURIComponent('👍')),
      );
      expect(code(react)).toBe(ErrorCode.MemberTimedOut);
      // Ended by the clock: sending works again.
      await db
        .update(serverMembers)
        .set({ timeoutUntil: new Date(now.getTime() - 1000) })
        .where(eq(serverMembers.userId, s.quan.userId));
      await send(s.quan, s.text.id).expect(201);
    });

    it('AC5: timed out until 21:00, changed to 1 giờ at 20:30 → 21:30, a new item, the reason stays', async () => {
      const s = await sampleServer();
      await s.binh
        .patch(s.member(s.quan))
        .send({ timeout_until: inMinutes(60), reason: 'Gửi tin liên tục' })
        .expect(200);
      // Set at 20:00 for 1 giờ; it is 20:30 now (13:12 UTC stands for 20:30).
      await db
        .update(serverMembers)
        .set({ timeoutUntil: new Date(now.getTime() + 30 * 60_000) })
        .where(eq(serverMembers.userId, s.quan.userId));
      const res = await s.binh
        .patch(s.member(s.quan))
        .send({ timeout_until: inMinutes(60) })
        .expect(200);
      expect(res.body).toMatchObject({
        timeout_until: '2026-10-18T14:12:00.000Z',
        timeout_reason: 'Gửi tin liên tục',
      });
      const items = await itemsOf(s.quan);
      expect(
        items.map((i) => (i.data as { action: string }).action).sort(),
      ).toEqual(['timeout', 'timeout_changed']);
      const entries = await audit(s.serverId);
      expect(entries.map((e) => e.actionType).sort()).toEqual([
        'MEMBER_TIMEOUT',
        'MEMBER_TIMEOUT_UPDATE',
      ]);
    });

    it('lift early: timeout_until null, no item; out of range → 40001', async () => {
      const s = await sampleServer();
      await s.binh
        .patch(s.member(s.quan))
        .send({ timeout_until: inMinutes(60), reason: 'x' })
        .expect(200);
      const res = await s.binh
        .patch(s.member(s.quan))
        .send({ timeout_until: null })
        .expect(200);
      expect(res.body).toMatchObject({
        timeout_until: null,
        timeout_reason: null,
      });
      expect(await itemsOf(s.quan)).toHaveLength(1);
      await send(s.quan, s.text.id).expect(201);
      for (const until of [inMinutes(0.5), inMinutes(29 * 24 * 60)])
        expect(
          code(
            await s.binh.patch(s.member(s.quan)).send({ timeout_until: until }),
          ),
        ).toBe(ErrorCode.ValidationError);
    });

    it('AC3 (âm): the Owner, a role level or above, an ADMINISTRATOR → 40301; without MODERATE_MEMBERS → 40302', async () => {
      const s = await sampleServer();
      const body = { timeout_until: inMinutes(60) };
      expect(code(await s.tuan.patch(s.member(s.an)).send(body))).toBe(
        ErrorCode.InsufficientRoleHierarchy,
      );
      expect(code(await s.binh.patch(s.member(s.tuan)).send(body))).toBe(
        ErrorCode.InsufficientRoleHierarchy,
      );
      // CR-28 #18: Lan's role is below Tuấn's but has ADMINISTRATOR.
      expect(code(await s.tuan.patch(s.member(s.lan)).send(body))).toBe(
        ErrorCode.InsufficientRoleHierarchy,
      );
      expect(code(await s.khanh.patch(s.member(s.quan)).send(body))).toBe(
        ErrorCode.Forbidden,
      );
      // ROLE-09 AC3: nothing refused is in the log.
      expect(await audit(s.serverId)).toEqual([]);
    });
  });

  describe('kick (REQ-ROLE-05)', () => {
    it('out of the server and the room; the kicked copy says kick and why, not who; others get the id only', async () => {
      const s = await sampleServer();
      await s.tuan
        .delete(s.member(s.khanh))
        .send({ reason: 'Gửi link quảng cáo nhiều lần' })
        .expect(204);
      expect(disconnected).toEqual([
        { userId: s.khanh.userId, serverId: s.serverId, reason: 'kicked' },
      ]);
      const own = sent.find(
        (e) => e.t === 'SERVER_MEMBER_REMOVE' && e.to === s.khanh.userId,
      );
      expect(own?.d).toEqual({
        server_id: s.server.id,
        user_id: s.khanh.id,
        action: 'kick',
        reason: 'Gửi link quảng cáo nhiều lần',
      });
      expect(
        sent.find((e) => e.t === 'server:SERVER_MEMBER_REMOVE')?.d,
      ).toEqual({ server_id: s.server.id, user_id: s.khanh.id });
      expect(
        code(await s.khanh.get(MemberRoutes.list.replace(':id', s.server.id))),
      ).toBe(ErrorCode.NotFound);
      const [entry] = await audit(s.serverId);
      expect(entry).toMatchObject({
        actorId: s.tuan.userId,
        targetId: s.khanh.userId,
        actionType: 'MEMBER_KICK',
        reason: 'Gửi link quảng cáo nhiều lần',
      });
    });

    it('the app is open → the item is created read; no body → no reason', async () => {
      const s = await sampleServer();
      foreground = true;
      await s.tuan.delete(s.member(s.khanh)).expect(204);
      const [item] = await itemsOf(s.khanh);
      expect(item!.readAt).not.toBeNull();
      expect(item!.data).toMatchObject({ action: 'kick', reason: null });
    });

    it('AC3 (âm): the Owner, oneself, a role level or above → 40301; no KICK_MEMBERS → 40302', async () => {
      const s = await sampleServer();
      expect(code(await s.tuan.delete(s.member(s.an)))).toBe(
        ErrorCode.InsufficientRoleHierarchy,
      );
      expect(code(await s.tuan.delete(s.member(s.tuan)))).toBe(
        ErrorCode.InsufficientRoleHierarchy,
      );
      expect(code(await s.binh.delete(s.member(s.khanh)))).toBe(
        ErrorCode.Forbidden,
      );
      expect(await audit(s.serverId)).toEqual([]);
    });
  });

  describe('ban (REQ-ROLE-05 / 07)', () => {
    it('AC1: delete_message_days 7 → their messages of 7 days are soft-deleted, one MESSAGE_DELETE_BULK per channel', async () => {
      const s = await sampleServer();
      const recent = (await send(s.khanh, s.text.id).expect(201)).body as {
        id: string;
      };
      const old = (await send(s.khanh, s.text.id, 'cũ').expect(201)).body as {
        id: string;
      };
      await db
        .update(messages)
        .set({ createdAt: new Date('2026-10-01T00:00:00Z') })
        .where(eq(messages.id, BigInt(old.id)));
      sent.length = 0;
      await s.tuan
        .put(s.ban(s.khanh))
        .send({ reason: 'spam', delete_message_days: 7 })
        .expect(204);
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.authorId, s.khanh.userId));
      expect(
        rows.find((m) => String(m.id) === recent.id)!.deletedAt,
      ).not.toBeNull();
      expect(rows.find((m) => String(m.id) === old.id)!.deletedAt).toBeNull();
      expect(sent.filter((e) => e.t === 'channel:MESSAGE_DELETE_BULK')).toEqual(
        [
          {
            to: BigInt(s.text.id),
            t: 'channel:MESSAGE_DELETE_BULK',
            d: {
              ids: [recent.id],
              channel_id: s.text.id,
              server_id: s.server.id,
            },
          },
        ],
      );
    });

    it('ROLE-09 AC2: ban with "spam" → actor, target, action, before / after, reason, time', async () => {
      const s = await sampleServer();
      await s.tuan.put(s.ban(s.khanh)).send({ reason: 'spam' }).expect(204);
      const [entry] = await audit(s.serverId);
      expect(entry).toMatchObject({
        actorId: s.tuan.userId,
        targetId: s.khanh.userId,
        actionType: 'MEMBER_BAN',
        reason: 'spam',
        changes: {
          before: { member: true, banned: false },
          after: { member: false, banned: true, delete_message_days: 0 },
        },
      });
      expect(entry!.createdAt).toBeInstanceOf(Date);
      expect(disconnected).toEqual([
        { userId: s.khanh.userId, serverId: s.serverId, reason: 'banned' },
      ]);
      expect(
        sent.find(
          (e) => e.t === 'SERVER_MEMBER_REMOVE' && e.to === s.khanh.userId,
        )?.d,
      ).toMatchObject({ action: 'ban', reason: 'spam' });
      // SERVER_BAN_ADD: An (Owner) and Tuấn (BAN_MEMBERS), Lan (ADMINISTRATOR); not Bình.
      const to = sent.filter((e) => e.t === 'SERVER_BAN_ADD').map((e) => e.to);
      expect(new Set(to)).toEqual(
        new Set([s.an.userId, s.tuan.userId, s.lan.userId]),
      );
    });

    it('ROLE-07 AC1 (âm) / AC2: banned → a new invite gives 40306; unbanned → joins again', async () => {
      const s = await sampleServer();
      await s.tuan.put(s.ban(s.khanh)).send({}).expect(204);
      const invite = (
        await s.an
          .post(InviteRoutes.create.replace(':id', s.text.id))
          .send({})
          .expect(201)
      ).body as { code: string };
      const accept = InviteRoutes.accept.replace(':code', invite.code);
      expect(code(await s.khanh.post(accept))).toBe(ErrorCode.BannedFromServer);
      await s.tuan.delete(s.ban(s.khanh)).expect(204);
      await s.khanh.post(accept).expect(200);
      expect(code(await s.tuan.delete(s.ban(s.khanh)))).toBe(
        ErrorCode.NotFound,
      );
      const actions = (await audit(s.serverId)).map((e) => e.actionType);
      expect(actions).toEqual(
        expect.arrayContaining(['MEMBER_BAN', 'MEMBER_UNBAN', 'INVITE_CREATE']),
      );
    });

    it('GET bans: newest first, the banner with username, q without marks; BAN_MEMBERS only', async () => {
      const s = await sampleServer();
      await s.tuan
        .put(s.ban(s.khanh))
        .send({ reason: 'Spam link cá cược' })
        .expect(204);
      now = new Date('2026-10-18T13:20:00Z');
      await s.an.put(s.ban(s.quan)).send({}).expect(204);
      const res = (await s.tuan.get(s.bans).expect(200))
        .body as BanListResponse;
      expect(res.bans.map((b) => b.user.display_name)).toEqual([
        'Quân',
        'Khánh',
      ]);
      expect(res.bans[1]).toMatchObject({
        reason: 'Spam link cá cược',
        banned_by: {
          id: s.tuan.id,
          username: s.tuan.username,
          display_name: 'Tuấn',
        },
      });
      const found = (await s.tuan.get(`${s.bans}?q=khanh`).expect(200))
        .body as BanListResponse;
      expect(found.bans.map((b) => b.user.display_name)).toEqual(['Khánh']);
      const page = (await s.tuan.get(`${s.bans}?limit=1`).expect(200))
        .body as BanListResponse;
      expect(page.bans).toHaveLength(1);
      const next = (
        await s.tuan
          .get(
            `${s.bans}?limit=1&after=${encodeURIComponent(page.next_cursor!)}`,
          )
          .expect(200)
      ).body as BanListResponse;
      expect(next.bans.map((b) => b.user.display_name)).toEqual(['Khánh']);
      // An unreadable cursor starts at the top, never a 500.
      await s.tuan
        .get(`${s.bans}?after=${encodeURIComponent('x|y')}`)
        .expect(200);
      expect(code(await s.binh.get(s.bans))).toBe(ErrorCode.Forbidden);
    });

    it('AC3 (âm): moderator bans the Owner → 40301; banned twice → 204, one entry', async () => {
      const s = await sampleServer();
      expect(code(await s.tuan.put(s.ban(s.an)).send({}))).toBe(
        ErrorCode.InsufficientRoleHierarchy,
      );
      await s.tuan.put(s.ban(s.khanh)).send({}).expect(204);
      await s.tuan.put(s.ban(s.khanh)).send({}).expect(204);
      expect((await audit(s.serverId)).map((e) => e.actionType)).toEqual([
        'MEMBER_BAN',
      ]);
    });
  });

  describe('audit log (REQ-ROLE-09, NFR-SEC-05)', () => {
    it('role given, role and server changed are logged', async () => {
      const s = await sampleServer();
      const roles = (
        await s.an.get(RoleRoutes.list.replace(':id', s.server.id)).expect(200)
      ).body as RoleResponse[];
      const quanTri = roles.find((r) => r.name === 'Quản trị')!;
      await s.an
        .put(
          MemberRoutes.role
            .replace(':id', s.server.id)
            .replace(':userId', s.khanh.id)
            .replace(':roleId', quanTri.id),
        )
        .expect(204);
      await s.an
        .patch(ServerRoutes.byId.replace(':id', s.server.id))
        .send({ name: 'Ôn thi Giải tích 3' })
        .expect(200);
      const entries = await audit(s.serverId);
      expect(entries.map((e) => e.actionType)).toEqual(
        expect.arrayContaining(['MEMBER_ROLE_UPDATE', 'SERVER_UPDATE']),
      );
      expect(
        entries.find((e) => e.actionType === 'MEMBER_ROLE_UPDATE')!.changes,
      ).toEqual({
        before: { role_ids: [] },
        after: { role_ids: [quanTri.id] },
      });
      expect(
        entries.find((e) => e.actionType === 'SERVER_UPDATE')!.changes,
      ).toEqual({
        before: expect.objectContaining({ name: 'Ôn thi Giải tích 2' }),
        after: expect.objectContaining({ name: 'Ôn thi Giải tích 3' }),
      });
    });

    it('append-only: no way to change or delete an entry, and a deleted server keeps them', async () => {
      const repo = app.get(AuditLogRepository) as unknown as Record<
        string,
        unknown
      >;
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repo));
      expect(methods.filter((m) => m !== 'constructor')).toEqual(['insert']);
      const s = await sampleServer();
      await s.tuan.delete(s.member(s.khanh)).expect(204);
      await db.delete(servers).where(eq(servers.id, s.serverId));
      expect(await audit(s.serverId)).toHaveLength(1);
    });
  });
});
