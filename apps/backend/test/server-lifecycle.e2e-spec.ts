import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  InviteRoutes,
  RoleRoutes,
  ServerRoutes,
  type DeletedServersResponse,
  type RoleResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { Clock } from '../src/common/clock.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
import { auditLogs } from '../src/modules/safety/audit-log.schema.js';
import { ServerLifecycleService } from '../src/modules/servers/server-lifecycle.service.js';
import {
  channels,
  invites,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
} from '../src/modules/servers/servers.schema.js';
import { users } from '../src/modules/users/users.schema.js';
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
const PASSWORD = completion('x').password;
const DAY_MS = 24 * 60 * 60_000;

// REQ-SRV-05 (P3-A4.1 #130) through REST and Postgres. Needs `pnpm dev:infra`.
describe('Server lifecycle (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let now = new Date('2026-10-18T13:12:00Z');
  const sent: Sent[] = [];
  const voice: { userId?: bigint; scope?: unknown; reason: string }[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b
        .overrideProvider(EventPublisher)
        .useValue({
          toUser: async (to: bigint, t: string, d: unknown) =>
            void sent.push({ to, t, d }),
          toServer: async (to: bigint, t: string, d: unknown) =>
            void sent.push({ to, t: `server:${t}`, d }),
          toChannel: async () => {},
          toServerSubscribers: async () => {},
          toLogin: async () => {},
        })
        .overrideProvider(VoiceService)
        .useValue({
          disconnect: async (
            userId: bigint,
            scope: unknown,
            reason: string,
          ) => {
            voice.push({ userId, scope, reason });
            return true;
          },
          roomDeleted: async (serverId: bigint, channelId: bigint) => {
            voice.push({ scope: { serverId, channelId }, reason: 'room' });
          },
          seatOf: async () => null,
          occupants: async () => [],
        })
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
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      delete: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An owns "Ôn thi Giải tích 2" with the role Trưởng nhóm; Bình and Chi are members.
  const sampleServer = async () => {
    const [an, binh, chi] = await Promise.all([
      signedIn('An'),
      signedIn('Bình'),
      signedIn('Chi'),
    ]);
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    const serverId = BigInt(server.id);
    const role = (
      await an
        .post(RoleRoutes.list.replace(':id', server.id))
        .send({ name: 'Trưởng nhóm' })
        .expect(201)
    ).body as RoleResponse;
    await db
      .insert(serverMemberRoles)
      .values({ serverId, userId: an.userId, roleId: BigInt(role.id) });
    for (const who of [binh, chi])
      await db.insert(serverMembers).values({ serverId, userId: who.userId });
    sent.length = 0;
    voice.length = 0;
    const path = (route: string) => route.replace(':id', server.id);
    return { an, binh, chi, server, serverId, role, path };
  };

  const code = (res: { body: { code?: number } }) => res.body.code;
  // Moving the clock would expire the tokens: the deletion moves back instead.
  const deletedDaysAgo = (serverId: bigint, days: number) =>
    db
      .update(servers)
      .set({ deletedAt: new Date(now.getTime() - days * DAY_MS) })
      .where(eq(servers.id, serverId));
  const auditOf = (serverId: bigint) =>
    db.select().from(auditLogs).where(eq(auditLogs.serverId, serverId));
  const ownerOf = async (serverId: bigint) =>
    (
      await db
        .select({ ownerId: servers.ownerId })
        .from(servers)
        .where(eq(servers.id, serverId))
    )[0]!.ownerId;
  const transfer = (s: Awaited<ReturnType<typeof sampleServer>>, to: Me) =>
    s.an
      .post(s.path(ServerRoutes.transfer))
      .send({ user_id: to.id, password: PASSWORD });

  describe('transfer the Owner (AC1, AC2, v1.6)', () => {
    it('AC1: right password → owner_id = Bình, An keeps Trưởng nhóm, audit, inbox item', async () => {
      const s = await sampleServer();
      await transfer(s, s.binh).expect(204);

      expect(await ownerOf(s.serverId)).toBe(s.binh.userId);
      const anRoles = await db
        .select({ roleId: serverMemberRoles.roleId })
        .from(serverMemberRoles)
        .where(
          and(
            eq(serverMemberRoles.serverId, s.serverId),
            eq(serverMemberRoles.userId, s.an.userId),
          ),
        );
      expect(anRoles.map((r) => r.roleId)).toEqual([BigInt(s.role.id)]);
      const [entry] = (await auditOf(s.serverId)).filter(
        (e) => e.actionType === 'SERVER_OWNER_TRANSFER',
      );
      expect(entry).toMatchObject({
        actorId: s.an.userId,
        targetId: s.binh.userId,
      });
      const [item] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, s.binh.userId));
      expect(item).toMatchObject({
        type: 'owner_transferred',
        data: { actor_id: s.an.id, server_id: s.server.id },
      });
      expect(sent).toContainEqual(
        expect.objectContaining({
          t: 'server:SERVER_UPDATE',
          d: expect.objectContaining({ owner_id: s.binh.id }),
        }),
      );
      // The old Owner cannot do it twice.
      expect(code(await transfer(s, s.chi))).toBe(ErrorCode.Forbidden);
    });

    it('AC2 (âm): wrong password → 40102; the 5th wrong try in 10 minutes → 40029', async () => {
      const s = await sampleServer();
      const wrong = () =>
        s.an
          .post(s.path(ServerRoutes.transfer))
          .send({ user_id: s.binh.id, password: 'Sai2026!' });
      for (let i = 0; i < 4; i++)
        expect(code(await wrong())).toBe(ErrorCode.InvalidCredentials);
      const fifth = await wrong();
      expect(fifth.status).toBe(429);
      expect(fifth.headers['retry-after']).toBeDefined();
      expect(code(await transfer(s, s.binh))).toBe(ErrorCode.RateLimited);
      expect(await ownerOf(s.serverId)).toBe(s.an.userId);
      expect(
        (await auditOf(s.serverId)).filter(
          (e) => e.actionType === 'SERVER_OWNER_TRANSFER',
        ),
      ).toEqual([]);
    });

    it('v1.6 (âm): a pending-deletion recipient → 40303; one who left → 40401; a non-Owner → 40302', async () => {
      const s = await sampleServer();
      await db
        .update(users)
        .set({ accountStatus: 'pending_deletion' })
        .where(eq(users.id, s.chi.userId));
      expect(code(await transfer(s, s.chi))).toBe(ErrorCode.CannotMessageUser);

      await s.binh.delete(s.path(ServerRoutes.leave)).expect(204);
      expect(code(await transfer(s, s.binh))).toBe(ErrorCode.NotFound);

      expect(
        code(
          await s.chi
            .post(s.path(ServerRoutes.transfer))
            .send({ user_id: s.an.id, password: PASSWORD }),
        ),
      ).toBe(ErrorCode.Forbidden);
      expect(await ownerOf(s.serverId)).toBe(s.an.userId);
    });
  });

  describe('leave (AC3, AC5)', () => {
    it('AC3 (âm): the Owner → 40012, still in', async () => {
      const s = await sampleServer();
      expect(code(await s.an.delete(s.path(ServerRoutes.leave)))).toBe(
        ErrorCode.OwnerCannotLeave,
      );
      await s.an.get(s.path(ServerRoutes.byId)).expect(200);
    });

    it('AC5: a member leaves → out of the room (left_server), SERVER_MEMBER_REMOVE without action', async () => {
      const s = await sampleServer();
      await s.binh.delete(s.path(ServerRoutes.leave)).expect(204);

      expect(voice).toEqual([
        {
          userId: s.binh.userId,
          scope: { serverId: s.serverId },
          reason: 'left_server',
        },
      ]);
      const removed = { server_id: s.server.id, user_id: s.binh.id };
      expect(sent).toEqual([
        { to: s.binh.userId, t: 'SERVER_MEMBER_REMOVE', d: removed },
        { to: s.serverId, t: 'server:SERVER_MEMBER_REMOVE', d: removed },
      ]);
      expect(code(await s.binh.get(s.path(ServerRoutes.byId)))).toBe(
        ErrorCode.NotFound,
      );
      expect(code(await s.binh.delete(s.path(ServerRoutes.leave)))).toBe(
        ErrorCode.NotFound,
      );
    });
  });

  describe('delete and restore (AC4, v1.7)', () => {
    it('AC4: Owner deletes → SERVER_DELETE, rooms closed, gone for members, invite 40041', async () => {
      const s = await sampleServer();
      const text = s.server.channels.find((c) => c.type === 'text')!;
      const invite = (
        await s.an
          .post(InviteRoutes.create.replace(':id', text.id))
          .send({})
          .expect(201)
      ).body as { code: string };
      expect(code(await s.binh.delete(s.path(ServerRoutes.byId)))).toBe(
        ErrorCode.Forbidden,
      );

      await s.an.delete(s.path(ServerRoutes.byId)).expect(204);

      expect(sent).toContainEqual({
        to: s.serverId,
        t: 'server:SERVER_DELETE',
        d: { id: s.server.id },
      });
      const rooms = s.server.channels.filter((c) => c.type === 'voice');
      expect(voice.filter((v) => v.reason === 'room')).toHaveLength(
        rooms.length,
      );
      for (const who of [s.an, s.binh])
        expect(code(await who.get(s.path(ServerRoutes.byId)))).toBe(
          ErrorCode.NotFound,
        );
      expect(
        code(
          await s.chi.get(InviteRoutes.byCode.replace(':code', invite.code)),
        ),
      ).toBe(ErrorCode.InviteInvalid);
      // Twice: nothing more happens.
      await s.an.delete(s.path(ServerRoutes.byId)).expect(404);
    });

    it('v1.7: the Owner lists and restores within 30 days → SERVER_CREATE to members, invite works again', async () => {
      const s = await sampleServer();
      const text = s.server.channels.find((c) => c.type === 'text')!;
      const invite = (
        await s.an
          .post(InviteRoutes.create.replace(':id', text.id))
          .send({})
          .expect(201)
      ).body as { code: string };
      await s.an.delete(s.path(ServerRoutes.byId)).expect(204);
      await deletedDaysAgo(s.serverId, 29);

      const list = (await s.an.get(ServerRoutes.deleted).expect(200))
        .body as DeletedServersResponse;
      expect(list.servers).toEqual([
        {
          id: s.server.id,
          name: 'Ôn thi Giải tích 2',
          icon_url: null,
          deleted_at: '2026-09-19T13:12:00.000Z',
          restore_until: '2026-10-19T13:12:00.000Z',
        },
      ]);
      expect(
        (
          (await s.binh.get(ServerRoutes.deleted).expect(200))
            .body as DeletedServersResponse
        ).servers,
      ).toEqual([]);
      expect(code(await s.binh.post(s.path(ServerRoutes.restore)))).toBe(
        ErrorCode.NotFound,
      );

      sent.length = 0;
      const restored = (
        await s.an.post(s.path(ServerRoutes.restore)).expect(200)
      ).body as ServerResponse;
      expect(restored.id).toBe(s.server.id);
      expect(
        sent.filter((e) => e.t === 'SERVER_CREATE').map((e) => e.to),
      ).toEqual(
        expect.arrayContaining([s.an.userId, s.binh.userId, s.chi.userId]),
      );
      expect(sent.some((e) => e.t.startsWith('NOTIFICATION'))).toBe(false);
      await s.binh.get(s.path(ServerRoutes.byId)).expect(200);
      await s.chi
        .get(InviteRoutes.byCode.replace(':code', invite.code))
        .expect(200);
    });

    it('SRS 8.6: after 30 days no restore; the purge empties the server but keeps its rows', async () => {
      const s = await sampleServer();
      await s.an.delete(s.path(ServerRoutes.byId)).expect(204);
      await deletedDaysAgo(s.serverId, 31);
      expect(code(await s.an.post(s.path(ServerRoutes.restore)))).toBe(
        ErrorCode.NotFound,
      );
      expect(
        (
          (await s.an.get(ServerRoutes.deleted).expect(200))
            .body as DeletedServersResponse
        ).servers,
      ).toEqual([]);

      const purged = await app.get(ServerLifecycleService).purge();
      expect(purged).toContain(s.serverId);
      const left = async <T>(rows: Promise<T[]>) => (await rows).length;
      expect(
        await left(
          db
            .select()
            .from(serverMembers)
            .where(eq(serverMembers.serverId, s.serverId)),
        ),
      ).toBe(0);
      expect(
        await left(
          db.select().from(roles).where(eq(roles.serverId, s.serverId)),
        ),
      ).toBe(1); // @everyone
      expect(
        await left(
          db.select().from(invites).where(eq(invites.serverId, s.serverId)),
        ),
      ).toBe(0);
      expect(
        await left(db.select().from(servers).where(eq(servers.id, s.serverId))),
      ).toBe(1);
      expect(
        await left(
          db.select().from(channels).where(eq(channels.serverId, s.serverId)),
        ),
      ).toBeGreaterThan(0);
      expect(await app.get(ServerLifecycleService).purge()).not.toContain(
        s.serverId,
      );
    });
  });
});
