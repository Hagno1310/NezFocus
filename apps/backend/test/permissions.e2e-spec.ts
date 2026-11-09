import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  Permission as P,
  ServerRoutes,
  type PermissionChannel,
  type PermissionOverwriteInput,
  type ServerResponse,
} from '@nezfocus/shared';
import { PERMISSION_MATRIX } from '@nezfocus/shared/testing';
import { Clock } from '../src/common/clock.js';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { DbPermissionService } from '../src/modules/permissions/db-permission.service.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import {
  ChannelTypeCode,
  OverwriteTargetCode,
  channelPermissionOverwrites,
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
} from '../src/modules/servers/servers.schema.js';
import { users } from '../src/modules/users/users.schema.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';
import { eq } from 'drizzle-orm';

// Real time for sign-in; a matrix case sets its own `now`.
const clock = {
  fixed: null as Date | null,
  now() {
    return this.fixed ?? new Date();
  },
};

// REQ-ROLE-08 / ROLE-02 with the DB-backed PermissionService. Needs `pnpm dev:infra`.
describe('PermissionService on Postgres (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let ids: SnowflakeGenerator;
  let service: DbPermissionService;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(Clock).useValue(clock),
    ));
    db = app.get(DB);
    ids = app.get(SnowflakeGenerator);
    service = app.get(DbPermissionService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('AC1: the P0-6 matrix gives the same bitmap as the shared library', () => {
    // SRS 8.2 CHECK ((allow & deny) = 0): a row cannot hold this case, so the DB never meets it.
    const storable = (o: PermissionOverwriteInput) => (o.allow & o.deny) === 0n;
    const cases = PERMISSION_MATRIX.filter((c) =>
      [
        ...(c.channel?.overwrites ?? []),
        ...(c.channel?.parent?.overwrites ?? []),
      ].every(storable),
    );

    it('keeps at least 50 cases (SRS 9.2)', () => {
      expect(cases.length).toBeGreaterThanOrEqual(50);
      expect(PERMISSION_MATRIX.length - cases.length).toBe(1);
    });

    // Matrix ids are small strings; each case gets fresh Snowflakes for its server and roles.
    const people = new Map<string, bigint>();
    const user = async (matrixId: string) => {
      if (!people.has(matrixId)) {
        const id = ids.next();
        await db.insert(users).values({ id });
        people.set(matrixId, id);
      }
      return people.get(matrixId)!;
    };

    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_, c) => {
      const serverId = ids.next();
      const roleIds = new Map(
        c.server.roles.map((r) => [
          r.id,
          r.id === c.server.id ? serverId : ids.next(),
        ]),
      );
      const target = (o: PermissionOverwriteInput) =>
        o.type === 'role' ? roleIds.get(o.targetId)! : people.get(o.targetId)!;
      const ownerId = await user(c.server.ownerId);
      const memberId = await user(c.member.userId);
      for (const o of [
        ...(c.channel?.overwrites ?? []),
        ...(c.channel?.parent?.overwrites ?? []),
      ])
        if (o.type === 'member') await user(o.targetId);

      await db
        .insert(servers)
        .values({ id: serverId, name: 'Ôn thi Giải tích 2', ownerId });
      await db.insert(roles).values(
        c.server.roles.map((r) => ({
          id: roleIds.get(r.id)!,
          serverId,
          name: r.id,
          permissions: r.permissions,
          position: r.position,
        })),
      );
      await db.insert(serverMembers).values({
        serverId,
        userId: memberId,
        timeoutUntil: c.member.timeoutUntil ?? null,
      });
      const memberRoles = c.member.roleIds.filter((r) => roleIds.has(r));
      if (memberRoles.length)
        await db.insert(serverMemberRoles).values(
          memberRoles.map((r) => ({
            serverId,
            userId: memberId,
            roleId: roleIds.get(r)!,
          })),
        );

      const insertChannel = async (
        type: PermissionChannel['type'],
        overwrites: readonly PermissionOverwriteInput[],
        parentId: bigint | null = null,
        permissionsSynced = false,
      ) => {
        const id = ids.next();
        await db.insert(channels).values({
          id,
          serverId,
          type: ChannelTypeCode[type],
          name: type,
          parentId,
          permissionsSynced,
        });
        if (overwrites.length)
          await db.insert(channelPermissionOverwrites).values(
            overwrites.map((o) => ({
              channelId: id,
              targetId: target(o),
              targetType: OverwriteTargetCode[o.type],
              allow: o.allow,
              deny: o.deny,
            })),
          );
        return id;
      };

      let scope: { serverId: bigint } | { channelId: bigint } = { serverId };
      if (c.channel) {
        const parent = c.channel.parent
          ? await insertChannel('category', c.channel.parent.overwrites)
          : null;
        scope = {
          channelId: await insertChannel(
            c.channel.type,
            c.channel.overwrites,
            parent,
            !!c.channel.permissionsSynced,
          ),
        };
      }

      clock.fixed = c.now;
      try {
        expect(await service.permissionsIn(memberId, scope)).toBe(c.expected);
      } finally {
        clock.fixed = null;
      }
    });
  });

  describe('through the API', () => {
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
        get: (path: string) => api.get(path).auth(token, auth),
        post: (path: string) => api.post(path).auth(token, auth),
        patch: (path: string) => api.patch(path).auth(token, auth),
        delete: (path: string) => api.delete(path).auth(token, auth),
      };
    };
    type Me = Awaited<ReturnType<typeof signedIn>>;

    // An's general server, with Bình as a plain member.
    const serverWithMember = async () => {
      const an = await signedIn();
      const binh = await signedIn();
      const server = (
        await an
          .post(ServerRoutes.create)
          .send({ name: 'CLB Guitar PTIT', template: 'general' })
          .expect(201)
      ).body as ServerResponse;
      await db
        .insert(serverMembers)
        .values({ serverId: BigInt(server.id), userId: binh.userId });
      const text = server.channels.find((c) => c.type === 'text')!;
      return { an, binh, server, text };
    };

    const code = (res: { body: { code?: number } }) => res.body.code;

    it('AC2 (SRV-02 AC4, SRV-01 AC5): a member without the bit gets 40302 from every guarded endpoint', async () => {
      const { binh, server, text } = await serverWithMember();
      const list = ChannelRoutes.list.replace(':id', server.id);
      const calls = [
        binh
          .post(list)
          .send({ type: 'text', name: 'tai-lieu', parent_id: null }),
        binh
          .patch(ChannelRoutes.byId.replace(':id', text.id))
          .send({ name: 'chat' }),
        binh.delete(ChannelRoutes.byId.replace(':id', text.id)),
        binh
          .patch(ChannelRoutes.positions.replace(':id', server.id))
          .send([{ id: text.id, position: 3, parent_id: text.parent_id }]),
        binh
          .patch(ServerRoutes.byId.replace(':id', server.id))
          .send({ system_channel_id: null }),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(403);
        expect(code(res)).toBe(ErrorCode.Forbidden);
      }
    });

    it('AC3: a role losing MANAGE_CHANNELS stops working at once after the invalidation', async () => {
      const { binh, server } = await serverWithMember();
      const serverId = BigInt(server.id);
      const roleId = ids.next();
      await db.insert(roles).values({
        id: roleId,
        serverId,
        name: 'Quản trị',
        permissions: P.MANAGE_CHANNELS,
        position: 1,
      });
      await db
        .insert(serverMemberRoles)
        .values({ serverId, userId: binh.userId, roleId });
      const list = ChannelRoutes.list.replace(':id', server.id);
      await binh
        .post(list)
        .send({ type: 'text', name: 'mot', parent_id: null })
        .expect(201);

      // ponytail: PATCH /roles invalidates by itself with P1-A3.3 (#66); here the test does it.
      await db
        .update(roles)
        .set({ permissions: 0n })
        .where(eq(roles.id, roleId));
      const started = Date.now();
      await app.get(PermissionCache).invalidateServer(serverId);
      const res = await binh
        .post(list)
        .send({ type: 'text', name: 'hai', parent_id: null });
      expect(code(res)).toBe(ErrorCode.Forbidden);
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it('ROLE-03 AC3: without VIEW_CHANNEL a channel is not listed and answers 40401', async () => {
      const { an, binh, server, text } = await serverWithMember();
      await db.insert(channelPermissionOverwrites).values({
        channelId: BigInt(text.parent_id!), // #general follows "Kênh chung"
        targetId: BigInt(server.id), // @everyone
        targetType: OverwriteTargetCode.role,
        deny: P.VIEW_CHANNEL,
      });
      await app.get(PermissionCache).invalidateServer(BigInt(server.id));

      const seen = async (me: Me) => {
        const channelsRes = await me
          .get(ChannelRoutes.list.replace(':id', server.id))
          .expect(200);
        const serverRes = await me
          .get(ServerRoutes.byId.replace(':id', server.id))
          .expect(200);
        return [
          channelsRes.body,
          (serverRes.body as ServerResponse).channels,
        ].map((list: { id: string }[]) => list.some((c) => c.id === text.id));
      };
      expect(await seen(binh)).toEqual([false, false]);
      expect(await seen(an)).toEqual([true, true]); // the Owner sees everything
      const res = await binh
        .patch(ChannelRoutes.byId.replace(':id', text.id))
        .send({ name: 'chat' });
      expect(code(res)).toBe(ErrorCode.NotFound);
    });
  });
});
