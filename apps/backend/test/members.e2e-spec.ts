import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  MemberRoutes,
  Permission as P,
  RoleRoutes,
  ServerRoutes,
  toPermissionBitmap,
  type ChannelResponse,
  type MemberListResponse,
  type RoleResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import {
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

type Sent = { to: bigint; t: string; d: unknown };

// REQ-ROLE-04 (P2-A2.1 #96) through REST and Postgres. Needs `pnpm dev:infra`.
describe('Members (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const toServer: Sent[] = [];
  const toUser: Sent[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(EventPublisher).useValue({
        toUser: async (to: bigint, t: string, d: unknown) =>
          void toUser.push({ to, t, d }),
        toServer: async (to: bigint, t: string, d: unknown) =>
          void toServer.push({ to, t, d }),
        toChannel: async () => {},
      }),
    ));
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const signedIn = async (displayName: string, username = uniqueUsername()) => {
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

  // Spec 08 › Quy ước chung: An owns; Quản trị (Tuấn, MANAGE_ROLES) > Trưởng nhóm (Bình)
  // > Điều phối phòng học (Chi) > @everyone; Khánh has no role.
  const sampleServer = async () => {
    const [an, tuan, binh, chi, khanh] = await Promise.all([
      signedIn('An'),
      signedIn('Tuấn'),
      signedIn('Bình'),
      signedIn('Chi'),
      signedIn('Khánh'),
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
    const dieuPhoi = await create('Điều phối phòng học', P.MANAGE_STUDY_ROOMS);
    const truongNhom = await create('Trưởng nhóm', P.MANAGE_MESSAGES);
    const quanTri = await create('Quản trị', P.MANAGE_ROLES | P.KICK_MEMBERS);
    for (const who of [tuan, binh, chi, khanh])
      await db.insert(serverMembers).values({ serverId, userId: who.userId });
    const give = (who: Me, r: RoleResponse) =>
      db
        .insert(serverMemberRoles)
        .values({ serverId, userId: who.userId, roleId: BigInt(r.id) });
    await give(tuan, quanTri);
    await give(binh, truongNhom);
    await give(chi, dieuPhoi);
    toServer.length = 0;
    toUser.length = 0;
    const list = MemberRoutes.list.replace(':id', server.id);
    const role = (who: Me, r: { id: string }) =>
      MemberRoutes.role
        .replace(':id', server.id)
        .replace(':userId', who.id)
        .replace(':roleId', r.id);
    return {
      ...{ an, tuan, binh, chi, khanh },
      server,
      serverId,
      list,
      role,
      dieuPhoi,
      truongNhom,
      quanTri,
    };
  };

  const code = (res: { body: { code?: number } }) => res.body.code;
  const names = (res: { body: MemberListResponse }) =>
    res.body.members.map((m) => m.user.display_name);

  it('GET: by name (Vietnamese order), with roles, joined_at and timeout_until', async () => {
    const s = await sampleServer();
    const res = await s.khanh.get(s.list).expect(200);
    expect(names(res)).toEqual(['An', 'Bình', 'Chi', 'Khánh', 'Tuấn']);
    const binh = (res.body as MemberListResponse).members[1]!;
    expect(binh).toMatchObject({
      user: { id: s.binh.id, username: s.binh.username, avatar: null },
      role_ids: [s.truongNhom.id],
      timeout_until: null,
    });
    expect(binh.joined_at).toEqual(expect.any(String));
    expect(res.body.next_cursor).toBeNull();
    const outsider = await signedIn('Lan');
    expect(code(await outsider.get(s.list))).toBe(ErrorCode.NotFound);
  });

  it('GET: cursor pages and `q` without marks over name and username', async () => {
    const s = await sampleServer();
    const first = await s.an.get(`${s.list}?limit=2`).expect(200);
    expect(names(first)).toEqual(['An', 'Bình']);
    const next = await s.an
      .get(s.list)
      .query({ limit: 2, after: first.body.next_cursor })
      .expect(200);
    expect(names(next)).toEqual(['Chi', 'Khánh']);
    expect(
      names(await s.an.get(s.list).query({ q: 'KH' }).expect(200)),
    ).toEqual(['Khánh']);
    expect(
      names(await s.an.get(s.list).query({ q: s.tuan.username }).expect(200)),
    ).toEqual(['Tuấn']);
  });

  it('GET channel_id: only who can VIEW_CHANNEL the channel', async () => {
    const s = await sampleServer();
    const priv = (
      await s.an
        .post(ChannelRoutes.list.replace(':id', s.server.id))
        .send({
          type: 'text',
          name: 'ban-dieu-hanh',
          viewer_role_ids: [s.truongNhom.id],
        })
        .expect(201)
    ).body as ChannelResponse;
    const res = await s.binh
      .get(s.list)
      .query({ channel_id: priv.id })
      .expect(200);
    expect(names(res)).toEqual(['An', 'Bình']);
    expect(code(await s.khanh.get(s.list).query({ channel_id: priv.id }))).toBe(
      ErrorCode.NotFound,
    );
  });

  it('AC1 (âm): no MANAGE_ROLES → 40302; a role at or above one’s highest → 40301', async () => {
    const s = await sampleServer();
    expect(code(await s.binh.put(s.role(s.khanh, s.dieuPhoi)))).toBe(
      ErrorCode.Forbidden,
    );
    // Tuấn's highest is Quản trị: level with it is refused, below it passes.
    expect(code(await s.tuan.put(s.role(s.khanh, s.quanTri)))).toBe(
      ErrorCode.InsufficientRoleHierarchy,
    );
    await s.tuan.put(s.role(s.khanh, s.truongNhom)).expect(204);
  });

  it('AC1 (âm): giving to or taking from the Owner or someone level with / above → 40301', async () => {
    const s = await sampleServer();
    await db.insert(serverMemberRoles).values({
      serverId: s.serverId,
      userId: s.binh.userId,
      roleId: BigInt(s.quanTri.id),
    });
    for (const who of [s.an, s.binh])
      for (const send of [s.tuan.put, s.tuan.delete])
        expect(code(await send(s.role(who, s.dieuPhoi)))).toBe(
          ErrorCode.InsufficientRoleHierarchy,
        );
  });

  it('CR-28 #24: on oneself only the role counts; the Owner gives any role to themselves', async () => {
    const s = await sampleServer();
    await s.an.put(s.role(s.an, s.quanTri)).expect(204);
    await s.tuan.put(s.role(s.tuan, s.dieuPhoi)).expect(204);
    expect(code(await s.tuan.delete(s.role(s.tuan, s.quanTri)))).toBe(
      ErrorCode.InsufficientRoleHierarchy,
    );
  });

  it('@everyone → 40001; unknown role or member → 40401', async () => {
    const s = await sampleServer();
    const res = await s.an.put(s.role(s.khanh, { id: s.server.id }));
    expect(code(res)).toBe(ErrorCode.ValidationError);
    expect(res.body.errors.role_id[0].code).toBe('EVERYONE');
    expect(code(await s.an.put(s.role(s.khanh, { id: '12345' })))).toBe(
      ErrorCode.NotFound,
    );
    const outsider = await signedIn('Lan');
    expect(code(await s.an.put(s.role(outsider, s.dieuPhoi)))).toBe(
      ErrorCode.NotFound,
    );
  });

  it('AC2: SERVER_MEMBER_UPDATE to the server, new permissions at the next request, channels to them', async () => {
    const s = await sampleServer();
    const priv = (
      await s.an
        .post(ChannelRoutes.list.replace(':id', s.server.id))
        .send({
          type: 'text',
          name: 'ban-dieu-hanh',
          viewer_role_ids: [s.truongNhom.id],
        })
        .expect(201)
    ).body as ChannelResponse;
    // Warm Khánh's cache: without the role he cannot see it.
    expect(code(await s.khanh.get(s.list).query({ channel_id: priv.id }))).toBe(
      ErrorCode.NotFound,
    );
    toServer.length = 0;
    toUser.length = 0;

    await s.tuan.put(s.role(s.khanh, s.truongNhom)).expect(204);
    expect(toServer).toEqual([
      {
        to: s.serverId,
        t: 'SERVER_MEMBER_UPDATE',
        d: expect.objectContaining({
          server_id: s.server.id,
          user: expect.objectContaining({ id: s.khanh.id }),
          role_ids: [s.truongNhom.id],
        }),
      },
    ]);
    expect(
      toUser.find(
        (e) =>
          e.t === 'CHANNEL_UPDATE' && (e.d as ChannelResponse).id === priv.id,
      ),
    ).toMatchObject({ to: s.khanh.userId });
    expect(toUser.every((e) => e.to === s.khanh.userId)).toBe(true);
    await s.khanh.get(s.list).query({ channel_id: priv.id }).expect(200);

    // Taken away: CHANNEL_DELETE for him, and the channel is closed again.
    toUser.length = 0;
    await s.tuan.delete(s.role(s.khanh, s.truongNhom)).expect(204);
    expect(
      toUser.find(
        (e) =>
          e.t === 'CHANNEL_DELETE' && (e.d as { id: string }).id === priv.id,
      ),
    ).toBeTruthy();
    expect(code(await s.khanh.get(s.list).query({ channel_id: priv.id }))).toBe(
      ErrorCode.NotFound,
    );

    // Nothing changed → no event.
    toServer.length = 0;
    await s.tuan.delete(s.role(s.khanh, s.truongNhom)).expect(204);
    expect(toServer).toEqual([]);
  });

  it('a role gaining VIEW_CHANNEL sends the channel again to everyone (P2-B1.2 #108)', async () => {
    const s = await sampleServer();
    const priv = (
      await s.an
        .post(ChannelRoutes.list.replace(':id', s.server.id))
        .send({
          type: 'text',
          name: 'ban-dieu-hanh',
          viewer_role_ids: [s.truongNhom.id],
        })
        .expect(201)
    ).body as ChannelResponse;
    toUser.length = 0;
    await s.an
      .patch(
        RoleRoutes.byId
          .replace(':id', s.server.id)
          .replace(':roleId', s.dieuPhoi.id),
      )
      .send({
        permissions: toPermissionBitmap(P.MANAGE_STUDY_ROOMS | P.ADMINISTRATOR),
      })
      .expect(200);
    expect(
      toUser.find(
        (e) =>
          e.to === s.chi.userId &&
          e.t === 'CHANNEL_UPDATE' &&
          (e.d as ChannelResponse).id === priv.id,
      ),
    ).toBeTruthy();
  });
});
