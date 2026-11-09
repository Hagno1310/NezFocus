import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  MAX_ROLES_PER_SERVER,
  Permission as P,
  RoleRoutes,
  ServerRoutes,
  toPermissionBitmap,
  type RoleListResponse,
  type RoleResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import {
  roles,
  serverMemberRoles,
  serverMembers,
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

type Sent = { t: string; d: unknown };

// REQ-ROLE-01/02 through REST and Postgres. Needs `pnpm dev:infra`.
describe('Roles (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const events: Sent[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(EventPublisher).useValue({
        toUser: async () => {},
        toServer: async (_id: bigint, t: string, d: unknown) =>
          void events.push({ t, d }),
        toChannel: async () => {},
      }),
    ));
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
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      patch: (path: string) => api.patch(path).auth(token, auth),
      delete: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // Spec 08 › Quy ước chung, in a general server An owns: Quản trị (Tuấn) > Trưởng nhóm
  // (Bình) > Điều phối phòng học (Chi) > @everyone. Roles are given in the DB (ROLE-04 is P2-A2).
  const sampleServer = async () => {
    const [an, tuan, binh, chi] = await Promise.all([
      signedIn(),
      signedIn(),
      signedIn(),
      signedIn(),
    ]);
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    const serverId = BigInt(server.id);
    const list = RoleRoutes.list.replace(':id', server.id);
    const role = (id: string) =>
      RoleRoutes.byId.replace(':id', server.id).replace(':roleId', id);
    const create = async (name: string, permissions: bigint) => {
      const made = (await an.post(list).send({ name }).expect(201))
        .body as RoleResponse;
      return (
        await an
          .patch(role(made.id))
          .send({ permissions: toPermissionBitmap(permissions) })
          .expect(200)
      ).body as RoleResponse;
    };
    const dieuPhoi = await create('Điều phối phòng học', P.MANAGE_STUDY_ROOMS);
    const truongNhom = await create('Trưởng nhóm', P.MANAGE_MESSAGES);
    const quanTri = await create(
      'Quản trị',
      P.MANAGE_ROLES | P.MANAGE_CHANNELS | P.KICK_MEMBERS | P.BAN_MEMBERS,
    );
    const give = async (who: Me, r: RoleResponse) => {
      await db
        .insert(serverMembers)
        .values({ serverId, userId: who.userId })
        .onConflictDoNothing();
      await db
        .insert(serverMemberRoles)
        .values({ serverId, userId: who.userId, roleId: BigInt(r.id) });
    };
    await give(tuan, quanTri);
    await give(binh, truongNhom);
    await give(chi, dieuPhoi);
    events.length = 0;
    return {
      an,
      tuan,
      binh,
      chi,
      server,
      serverId,
      list,
      role,
      positions: RoleRoutes.positions.replace(':id', server.id),
      dieuPhoi,
      truongNhom,
      quanTri,
    };
  };

  const code = (res: { body: { code?: number } }) => res.body.code;
  const fieldError = (
    res: {
      body: { errors?: Record<string, { code: string; message: string }[]> };
    },
    field: string,
  ) => res.body.errors?.[field]?.[0];
  const positionOf = async (id: string) =>
    (
      await db
        .select()
        .from(roles)
        .where(eq(roles.id, BigInt(id)))
    )[0]?.position;

  it('a new role has no permission and goes right below the creator’s highest role', async () => {
    const s = await sampleServer();
    expect(
      [s.dieuPhoi, s.truongNhom, s.quanTri].map((r) => r.position),
    ).toEqual([1, 2, 3]);
    const made = (
      await s.tuan.post(s.list).send({ name: 'Nhóm ôn đề' }).expect(201)
    ).body as RoleResponse;
    expect(made).toMatchObject({
      permissions: '0',
      position: 3,
      is_mentionable: false,
    });
    expect(await positionOf(s.quanTri.id)).toBe(4);
    expect(events.map((e) => e.t)).toEqual([
      'SERVER_ROLE_CREATE',
      'SERVER_ROLE_UPDATE',
    ]);
  });

  it('GET lists highest first, @everyone last, with member counts', async () => {
    const s = await sampleServer();
    const list = (await s.chi.get(s.list).expect(200)).body as RoleListResponse;
    expect(list.map((r) => [r.name, r.member_count])).toEqual([
      ['Quản trị', 1],
      ['Trưởng nhóm', 1],
      ['Điều phối phòng học', 1],
      ['@everyone', 4],
    ]);
    const outsider = await signedIn();
    expect(code(await outsider.get(s.list))).toBe(ErrorCode.NotFound);
  });

  it('AC1: a role above one’s highest is 40301, even with MANAGE_ROLES or ADMINISTRATOR', async () => {
    const s = await sampleServer();
    let res = await s.tuan
      .patch(s.role(s.quanTri.id))
      .send({ name: 'Ban điều hành' });
    expect(code(res)).toBe(ErrorCode.InsufficientRoleHierarchy);
    await s.an
      .patch(s.role(s.truongNhom.id))
      .send({ permissions: toPermissionBitmap(P.ADMINISTRATOR) })
      .expect(200);
    res = await s.binh
      .patch(s.role(s.quanTri.id))
      .send({ is_mentionable: true });
    expect(code(res)).toBe(ErrorCode.InsufficientRoleHierarchy);
    res = await s.binh.delete(s.role(s.quanTri.id));
    expect(code(res)).toBe(ErrorCode.InsufficientRoleHierarchy);
  });

  it('AC2: granting a bit one lacks is 40302; a bit one lacks may stay as it is', async () => {
    const s = await sampleServer();
    const res = await s.tuan.patch(s.role(s.truongNhom.id)).send({
      permissions: toPermissionBitmap(P.MANAGE_MESSAGES | P.MANAGE_SERVER),
    });
    expect(code(res)).toBe(ErrorCode.Forbidden);
    // Điều phối keeps MANAGE_STUDY_ROOMS (Tuấn lacks it) while Tuấn adds KICK_MEMBERS.
    const edited = (
      await s.tuan
        .patch(s.role(s.dieuPhoi.id))
        .send({
          permissions: toPermissionBitmap(
            P.MANAGE_STUDY_ROOMS | P.KICK_MEMBERS,
          ),
        })
        .expect(200)
    ).body as RoleResponse;
    expect(edited.permissions).toBe(
      String(P.MANAGE_STUDY_ROOMS | P.KICK_MEMBERS),
    );
    const removing = await s.tuan
      .patch(s.role(s.dieuPhoi.id))
      .send({ permissions: toPermissionBitmap(P.KICK_MEMBERS) });
    expect(code(removing)).toBe(ErrorCode.Forbidden);
  });

  it('AC3: the Owner edits every role', async () => {
    const s = await sampleServer();
    for (const r of [s.quanTri, s.truongNhom, s.dieuPhoi])
      await s.an.patch(s.role(r.id)).send({ is_mentionable: true }).expect(200);
    await s.an
      .patch(s.role(s.server.id))
      .send({ permissions: toPermissionBitmap(P.VIEW_CHANNEL) })
      .expect(200);
  });

  it('AC4 + AC5: a duplicate (any case, accents count) or a system name is 40001 on name', async () => {
    const s = await sampleServer();
    let res = await s.an.post(s.list).send({ name: 'trưởng nhóm' });
    expect(code(res)).toBe(ErrorCode.ValidationError);
    expect(fieldError(res, 'name')).toEqual({
      code: 'DUPLICATE_NAME',
      message: 'Đã có vai trò Trưởng nhóm',
    });
    await s.an.post(s.list).send({ name: 'Truong nhom' }).expect(201);
    res = await s.an.patch(s.role(s.dieuPhoi.id)).send({ name: 'QUẢN TRỊ' });
    expect(fieldError(res, 'name')?.code).toBe('DUPLICATE_NAME');
    res = await s.an.post(s.list).send({ name: '@here' });
    expect(fieldError(res, 'name')).toEqual({
      code: 'RESERVED_NAME',
      message: 'Tên này dành cho hệ thống',
    });
    res = await s.an.patch(s.role(s.dieuPhoi.id)).send({ name: 'everyone' });
    expect(fieldError(res, 'name')?.code).toBe('RESERVED_NAME');
  });

  it('a server holds at most 250 roles', async () => {
    const s = await sampleServer();
    const ids = app.get(SnowflakeGenerator);
    const have = 4; // @everyone + the three samples
    await db.insert(roles).values(
      Array.from({ length: MAX_ROLES_PER_SERVER - have }, (_, i) => ({
        id: ids.next(),
        serverId: s.serverId,
        name: `Nhóm ôn đề ${i + 1}`,
        position: 10 + i,
      })),
    );
    const res = await s.an.post(s.list).send({ name: 'Một vai trò nữa' });
    expect(fieldError(res, '_')?.code).toBe('MAX_ROLES');
  });

  it('@everyone stays at 0: no rename, no delete, no move', async () => {
    const s = await sampleServer();
    let res = await s.an.patch(s.role(s.server.id)).send({ name: 'Mọi người' });
    expect(fieldError(res, 'name')?.code).toBe('EVERYONE');
    res = await s.an.delete(s.role(s.server.id));
    expect(code(res)).toBe(ErrorCode.ValidationError);
    res = await s.an
      .patch(s.positions)
      .send([{ id: s.server.id, position: 2 }]);
    expect(code(res)).toBe(ErrorCode.ValidationError);
    expect(await positionOf(s.server.id)).toBe(0);
  });

  it('reorder: the Owner moves freely; nobody lifts a role to their own level (40301)', async () => {
    const s = await sampleServer();
    let res = await s.tuan
      .patch(s.positions)
      .send([{ id: s.truongNhom.id, position: 3 }]);
    expect(code(res)).toBe(ErrorCode.InsufficientRoleHierarchy);
    await s.tuan
      .patch(s.positions)
      .send([
        { id: s.dieuPhoi.id, position: 2 },
        { id: s.truongNhom.id, position: 1 },
      ])
      .expect(204);
    expect(await positionOf(s.dieuPhoi.id)).toBe(2);
    expect(events.filter((e) => e.t === 'SERVER_ROLE_UPDATE')).toHaveLength(2);
    res = await s.an
      .patch(s.positions)
      .send([{ id: s.truongNhom.id, position: 3 }]);
    expect(res.status).toBe(204);
    expect(await positionOf(s.truongNhom.id)).toBe(3);
  });

  it('saving keeps the bits without a screen (ROLE-02 v1.7); colour and hoist are not taken', async () => {
    const s = await sampleServer();
    await db
      .update(roles)
      .set({ permissions: P.MANAGE_EVENTS | P.MANAGE_MESSAGES })
      .where(eq(roles.id, BigInt(s.truongNhom.id)));
    const saved = (
      await s.an
        .patch(s.role(s.truongNhom.id))
        .send({ permissions: toPermissionBitmap(P.KICK_MEMBERS) })
        .expect(200)
    ).body as RoleResponse;
    expect(BigInt(saved.permissions)).toBe(P.MANAGE_EVENTS | P.KICK_MEMBERS);
    const res = await s.an.patch(s.role(s.truongNhom.id)).send({ color: 3 });
    expect(code(res)).toBe(ErrorCode.ValidationError);
  });

  it('a role losing a permission takes effect at once (ROLE-08 AC3)', async () => {
    const s = await sampleServer();
    const channels = ChannelRoutes.list.replace(':id', s.server.id);
    await s.tuan
      .post(channels)
      .send({ type: 'text', name: 'mot', parent_id: null })
      .expect(201);
    const started = Date.now();
    await s.an
      .patch(s.role(s.quanTri.id))
      .send({ permissions: toPermissionBitmap(P.MANAGE_ROLES) })
      .expect(200);
    const res = await s.tuan
      .post(channels)
      .send({ type: 'text', name: 'hai', parent_id: null });
    expect(code(res)).toBe(ErrorCode.Forbidden);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('deleting a role takes it from its members and sends SERVER_ROLE_DELETE', async () => {
    const s = await sampleServer();
    await s.an.delete(s.role(s.dieuPhoi.id)).expect(204);
    expect(
      await db
        .select()
        .from(serverMemberRoles)
        .where(eq(serverMemberRoles.roleId, BigInt(s.dieuPhoi.id))),
    ).toEqual([]);
    expect(events).toEqual([
      {
        t: 'SERVER_ROLE_DELETE',
        d: { server_id: s.server.id, role_id: s.dieuPhoi.id },
      },
    ]);
    const res = await s.an.patch(s.role(s.dieuPhoi.id)).send({ name: 'Lại' });
    expect(code(res)).toBe(ErrorCode.NotFound);
  });

  it('without MANAGE_ROLES every write is 40302', async () => {
    const s = await sampleServer();
    const calls = [
      s.binh.post(s.list).send({ name: 'Nhóm mới' }),
      s.binh.patch(s.role(s.dieuPhoi.id)).send({ name: 'Điều phối' }),
      s.binh.delete(s.role(s.dieuPhoi.id)),
      s.binh.patch(s.positions).send([{ id: s.dieuPhoi.id, position: 1 }]),
    ];
    for (const res of await Promise.all(calls))
      expect(code(res)).toBe(ErrorCode.Forbidden);
  });
});
