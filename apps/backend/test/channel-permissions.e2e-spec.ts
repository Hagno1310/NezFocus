import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  Permission as P,
  RoleRoutes,
  ServerRoutes,
  type ChannelResponse,
  type PermissionOverwrite,
  type ServerResponse,
} from '@nezfocus/shared';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import { PermissionService } from '../src/modules/permissions/permission.service.js';
import { buildServer } from '../src/modules/servers/server-templates.js';
import { ServersRepository } from '../src/modules/servers/servers.repository.js';
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

const list = (serverId: string) => ChannelRoutes.list.replace(':id', serverId);
const byId = (channelId: string) =>
  ChannelRoutes.byId.replace(':id', channelId);
const permission = (channelId: string, targetId: string) =>
  ChannelRoutes.permission
    .replace(':id', channelId)
    .replace(':targetId', targetId);
const bits = (n: bigint) => n.toString();

// REQ-ROLE-03 and REQ-SRV-02 AC10 with the real PermissionService, Postgres and the Gateway.
// Needs `pnpm dev:infra`.
describe('Channel permissions (e2e)', () => {
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
      patch: (path: string) => api.patch(path).auth(token, auth),
      put: (path: string) => api.put(path).auth(token, auth),
      delete: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An's general server ("Kênh chung" › #general, Phòng thoại chung) with these members.
  const serverOf = async (an: Me, ...members: Me[]) => {
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'CLB Guitar PTIT', template: 'general' })
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
    return {
      id: server.id,
      category: of('category'),
      text: of('text'),
      voice: of('voice'),
    };
  };

  // A role straight in the DB (role CRUD has its own e2e), held by `holders`.
  const addRole = async (
    serverId: string,
    name: string,
    position: number,
    permissions: bigint,
    holders: Me[] = [],
  ) => {
    const id = app.get(SnowflakeGenerator).next();
    await db.insert(roles).values({
      id,
      serverId: BigInt(serverId),
      name,
      position,
      permissions,
    });
    if (holders.length)
      await db.insert(serverMemberRoles).values(
        holders.map((h) => ({
          serverId: BigInt(serverId),
          userId: h.userId,
          roleId: id,
        })),
      );
    await app.get(PermissionCache).invalidateServer(BigInt(serverId));
    return id.toString();
  };

  const ow = (
    target_id: string,
    allow: bigint,
    deny: bigint,
    target_type: 'role' | 'member' = 'role',
  ): PermissionOverwrite => ({
    target_id,
    target_type,
    allow: bits(allow),
    deny: bits(deny),
  });
  const put = (me: Me, channelId: string, o: PermissionOverwrite) =>
    me.put(permission(channelId, o.target_id)).send({
      target_type: o.target_type,
      allow: o.allow,
      deny: o.deny,
    });

  const can = (me: Me, channelId: string, bit: bigint) =>
    app
      .get(PermissionService)
      .can(me.userId, { channelId: BigInt(channelId) }, bit);
  const channelsOf = async (me: Me, serverId: string) =>
    (await me.get(list(serverId)).expect(200)).body as ChannelResponse[];
  const channelOf = async (me: Me, serverId: string, id: string) =>
    (await channelsOf(me, serverId)).find((c) => c.id === id);
  const topText = async (me: Me, serverId: string, name: string) =>
    (await me.post(list(serverId)).send({ type: 'text', name }).expect(201))
      .body as ChannelResponse;

  it('ROLE-03 AC1 + AC2 through PUT: a member allow beats role denies, a role allow beats a role deny, at once', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const chi = await signedIn();
    const server = await serverOf(an, binh, chi);
    const x = await addRole(server.id, 'X', 1, 0n, [binh, chi]);
    const z = await addRole(server.id, 'Z', 2, 0n, [chi]);
    const c = await topText(an, server.id, 'thao-luan'); // own overwrites, no category
    expect(await can(binh, c.id, P.SEND_MESSAGES)).toBe(true); // now cached

    await put(an, c.id, ow(x, 0n, P.SEND_MESSAGES)).expect(200);
    expect(await can(binh, c.id, P.SEND_MESSAGES)).toBe(false);
    expect(await can(chi, c.id, P.SEND_MESSAGES)).toBe(false);

    const own = await put(
      an,
      c.id,
      ow(binh.id, P.SEND_MESSAGES, 0n, 'member'),
    ).expect(200);
    expect(own.body).toEqual(ow(binh.id, P.SEND_MESSAGES, 0n, 'member'));
    expect(await can(binh, c.id, P.SEND_MESSAGES)).toBe(true); // AC1

    await put(an, c.id, ow(z, P.SEND_MESSAGES, 0n)).expect(200);
    expect(await can(chi, c.id, P.SEND_MESSAGES)).toBe(true); // AC2

    const listed = await channelOf(binh, server.id, c.id);
    expect(listed!.permission_overwrites).toEqual([
      ow(x, 0n, P.SEND_MESSAGES),
      ow(z, P.SEND_MESSAGES, 0n),
      ow(binh.id, P.SEND_MESSAGES, 0n, 'member'),
    ]);
  });

  it('ROLE-03 AC3 through PUT: @everyone deny VIEW_CHANNEL hides the channel, 40401, and CHANNEL_DELETE to who lost it', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    const c = await topText(an, server.id, 'ban-quan-tri');
    const binhGateway = await connectGateway(app, binh.token);
    const anGateway = await connectGateway(app, an.token);

    await put(an, c.id, ow(server.id, 0n, P.VIEW_CHANNEL)).expect(200);
    const gone = await binhGateway.next('CHANNEL_DELETE');
    const update = await anGateway.next('CHANNEL_UPDATE');
    binhGateway.close();
    anGateway.close();

    expect(gone.d).toEqual({ id: c.id, server_id: server.id });
    expect(update.d).toMatchObject({
      id: c.id,
      permission_overwrites: [ow(server.id, 0n, P.VIEW_CHANNEL)],
    });
    expect(binhGateway.dispatches.map((x) => x.t)).not.toContain(
      'CHANNEL_UPDATE',
    );
    expect(await channelOf(binh, server.id, c.id)).toBeUndefined();
    const res = await binh.patch(byId(c.id)).send({ name: 'chat' });
    expect(res.body.code).toBe(ErrorCode.NotFound);
    const write = await put(
      binh,
      c.id,
      ow(binh.id, P.VIEW_CHANNEL, 0n, 'member'),
    );
    expect(write.body.code).toBe(ErrorCode.NotFound);
  });

  it('hiding a category hides its synced channels: CHANNEL_DELETE for them too, not for one with its own overwrites', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    await an
      .patch(byId(server.voice.id))
      .send({ permissions_synced: false })
      .expect(200);
    const gateway = await connectGateway(app, binh.token);

    await put(an, server.category.id, ow(server.id, 0n, P.VIEW_CHANNEL)).expect(
      200,
    );
    const isIt = (id: string) => (d: unknown) =>
      (d as { id: string }).id === id;
    await gateway.next('CHANNEL_DELETE', isIt(server.category.id));
    await gateway.next('CHANNEL_DELETE', isIt(server.text.id));
    gateway.close();

    expect((await channelsOf(binh, server.id)).map((c) => c.id)).toEqual([
      server.voice.id,
    ]);
  });

  it('SRV-02 AC10: a private channel reaches only its viewers; any role can be chosen, its category overwrites stay', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const chi = await signedIn();
    const tuan = await signedIn();
    const server = await serverOf(an, binh, chi, tuan);
    // Tuấn manages channels from a role below Mod's.
    await addRole(server.id, 'Quản lý kênh', 1, P.MANAGE_CHANNELS, [tuan]);
    const mod = await addRole(server.id, 'Mod', 2, 0n, [chi]);
    await put(
      an,
      server.category.id,
      ow(server.id, 0n, P.SEND_MESSAGES),
    ).expect(200);
    const gateways = await Promise.all(
      [an, binh, chi].map((m) => connectGateway(app, m.token)),
    );

    const created = await tuan
      .post(list(server.id))
      .send({
        type: 'text',
        name: 'ban quan tri',
        parent_id: server.category.id,
        viewer_role_ids: [mod],
      })
      .expect(201);
    const channel = created.body as ChannelResponse;
    expect(channel).toMatchObject({
      name: 'ban-quan-tri',
      permissions_synced: false,
      permission_overwrites: [
        ow(server.id, 0n, P.SEND_MESSAGES | P.VIEW_CHANNEL),
        ow(mod, P.VIEW_CHANNEL, 0n),
      ],
    });
    const isIt = (d: unknown) => (d as { id: string }).id === channel.id;
    const [anGateway, binhGateway, chiGateway] = gateways;
    await anGateway!.next('CHANNEL_CREATE', isIt);
    await chiGateway!.next('CHANNEL_CREATE', isIt);
    // Frames keep their order: once Bình has a later event, an earlier one would be there.
    await an.patch(byId(server.text.id)).send({ name: 'chung' }).expect(200);
    await binhGateway!.next('CHANNEL_UPDATE');
    gateways.forEach((g) => g.close());

    expect(binhGateway!.dispatches.some((x) => x.t === 'CHANNEL_CREATE')).toBe(
      false,
    );
    expect(await channelOf(binh, server.id, channel.id)).toBeUndefined();
    expect(await channelOf(chi, server.id, channel.id)).toBeDefined();
    expect(await channelOf(an, server.id, channel.id)).toBeDefined(); // the Owner
    // Tuấn picked no role of his own: only the warning of S-SET-09, he no longer sees it.
    expect(await channelOf(tuan, server.id, channel.id)).toBeUndefined();
  });

  it('SRV-02 AC10: an empty viewer list is private too; @everyone or a role of another server is 40001', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    const other = await serverOf(an);
    const foreign = await addRole(other.id, 'Mod', 1, 0n);
    let n = 0;
    const make = (viewer_role_ids: string[]) =>
      an
        .post(list(server.id))
        .send({ type: 'voice', name: `Phòng riêng ${++n}`, viewer_role_ids });

    const empty = await make([]).expect(201);
    expect(empty.body.permission_overwrites).toEqual([
      ow(server.id, 0n, P.VIEW_CHANNEL),
    ]);
    for (const ids of [[server.id], [foreign]]) {
      const res = await make(ids).expect(400);
      expect(res.body.errors.viewer_role_ids[0].code).toBe('UNKNOWN_ROLE');
    }
  });

  it('v1.7: a synced channel refuses its own overwrites; sync off copies the category, sync on drops them', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    const deny = ow(server.id, 0n, P.SEND_MESSAGES);
    await put(an, server.category.id, deny).expect(200);

    const synced = await put(an, server.text.id, deny).expect(400);
    expect(synced.body.errors._[0].code).toBe('SYNCED');

    const off = await an
      .patch(byId(server.text.id))
      .send({ permissions_synced: false })
      .expect(200);
    expect(off.body).toMatchObject({
      permissions_synced: false,
      permission_overwrites: [deny],
    });
    await put(
      an,
      server.text.id,
      ow(binh.id, P.SEND_MESSAGES, 0n, 'member'),
    ).expect(200);
    expect(await can(binh, server.text.id, P.SEND_MESSAGES)).toBe(true);

    const on = await an
      .patch(byId(server.text.id))
      .send({ permissions_synced: true })
      .expect(200);
    expect(on.body).toMatchObject({
      permissions_synced: true,
      permission_overwrites: [],
    });
    expect(await can(binh, server.text.id, P.SEND_MESSAGES)).toBe(false);

    const top = await topText(an, server.id, 'ngoai');
    for (const [id, value] of [
      [server.category.id, false],
      [top.id, true],
    ] as const) {
      const res = await an
        .patch(byId(id))
        .send({ permissions_synced: value })
        .expect(400);
      expect(res.body.errors).toHaveProperty('permissions_synced');
    }
  });

  it('v1.8: out of its category a synced channel keeps the overwrites in force; into another it follows that one', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    const deny = ow(server.id, 0n, P.SEND_MESSAGES);
    await put(an, server.category.id, deny).expect(200);
    const other = (
      await an
        .post(list(server.id))
        .send({ type: 'category', name: 'Khác' })
        .expect(201)
    ).body as ChannelResponse;
    const kept = (
      await an
        .post(list(server.id))
        .send({ type: 'text', name: 'con', parent_id: server.category.id })
        .expect(201)
    ).body as ChannelResponse;

    await an
      .patch(ChannelRoutes.positions.replace(':id', server.id))
      .send([
        { id: server.text.id, position: 0, parent_id: other.id },
        { id: server.voice.id, position: 5, parent_id: null },
      ])
      .expect(204);
    expect(await channelOf(an, server.id, server.text.id)).toMatchObject({
      permissions_synced: true,
      permission_overwrites: [],
    });
    expect(await can(binh, server.text.id, P.SEND_MESSAGES)).toBe(true);
    expect(await channelOf(an, server.id, server.voice.id)).toMatchObject({
      permissions_synced: false,
      permission_overwrites: [deny],
    });

    // Deleting the category is the same move for its synced children (REQ-SRV-02 AC5).
    await an.delete(byId(server.category.id)).expect(204);
    expect(await channelOf(an, server.id, kept.id)).toMatchObject({
      parent_id: null,
      permissions_synced: false,
      permission_overwrites: [deny],
    });
    expect(await can(binh, kept.id, P.SEND_MESSAGES)).toBe(false);
  });

  it('8.5.2: 40301 for a target level with or above you; 40302 for allowing a bit you lack or without MANAGE_CHANNELS', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const chi = await signedIn();
    const tuan = await signedIn();
    const stranger = await signedIn();
    const server = await serverOf(an, binh, chi, tuan);
    const lead = await addRole(server.id, 'Trưởng nhóm', 1, 0n, [binh]);
    const admin = await addRole(server.id, 'Quản trị', 2, P.MANAGE_CHANNELS, [
      tuan,
    ]);
    const top = await addRole(server.id, 'Cao nhất', 3, 0n, [chi]);
    const c = await topText(an, server.id, 'kenh');
    await put(an, c.id, ow(chi.id, P.SEND_MESSAGES, 0n, 'member')).expect(200);

    const outranked = [
      await put(tuan, c.id, ow(admin, 0n, P.SEND_MESSAGES)),
      await put(tuan, c.id, ow(top, 0n, P.SEND_MESSAGES)),
      await put(tuan, c.id, ow(an.id, 0n, P.SEND_MESSAGES, 'member')),
      await put(tuan, c.id, ow(chi.id, 0n, P.SEND_MESSAGES, 'member')),
      await tuan.delete(permission(c.id, chi.id)),
    ];
    expect(outranked.map((r) => r.body.code)).toEqual(
      Array(5).fill(ErrorCode.InsufficientRoleHierarchy),
    );

    const lacking = await put(tuan, c.id, ow(lead, P.MANAGE_ROLES, 0n));
    expect(lacking.body.code).toBe(ErrorCode.Forbidden);
    await put(tuan, c.id, ow(lead, P.SEND_MESSAGES, P.MANAGE_ROLES)).expect(
      200,
    );
    await put(tuan, c.id, ow(server.id, 0n, P.ATTACH_FILES)).expect(200);
    await put(tuan, c.id, ow(binh.id, 0n, P.SEND_MESSAGES, 'member')).expect(
      200,
    );

    const plain = await put(binh, c.id, ow(server.id, 0n, P.SEND_MESSAGES));
    expect(plain.body.code).toBe(ErrorCode.Forbidden);

    const unknownRole = await put(an, c.id, ow('1234', 0n, P.SEND_MESSAGES));
    const notMember = await put(
      an,
      c.id,
      ow(stranger.id, 0n, P.SEND_MESSAGES, 'member'),
    );
    for (const res of [unknownRole, notMember]) {
      expect(res.status).toBe(400);
      expect(res.body.errors.target_id[0].code).toBe('UNKNOWN_TARGET');
    }
    const both = await an
      .put(permission(c.id, server.id))
      .send({ target_type: 'role', allow: '512', deny: '512' });
    expect(both.status).toBe(400);
  });

  it('DELETE drops the overwrite (204, also when there is none) and applies at once', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    const c = await topText(an, server.id, 'kenh');
    await put(an, c.id, ow(binh.id, 0n, P.SEND_MESSAGES, 'member')).expect(200);
    expect(await can(binh, c.id, P.SEND_MESSAGES)).toBe(false);

    await an.delete(permission(c.id, binh.id)).expect(204);
    expect(await can(binh, c.id, P.SEND_MESSAGES)).toBe(true);
    expect(
      (await channelOf(an, server.id, c.id))!.permission_overwrites,
    ).toEqual([]);
    await an.delete(permission(c.id, binh.id)).expect(204);
  });

  it('deleting a role drops its overwrites: CHANNEL_UPDATE to who still sees the channel, CHANNEL_DELETE to who lost it', async () => {
    const an = await signedIn();
    const chi = await signedIn();
    const server = await serverOf(an, chi);
    const mod = await addRole(server.id, 'Mod', 1, 0n, [chi]);
    const secret = (
      await an
        .post(list(server.id))
        .send({ type: 'text', name: 'bi-mat', viewer_role_ids: [mod] })
        .expect(201)
    ).body as ChannelResponse;
    const anGateway = await connectGateway(app, an.token);
    const chiGateway = await connectGateway(app, chi.token);

    await an
      .delete(RoleRoutes.byId.replace(':id', server.id).replace(':roleId', mod))
      .expect(204);
    const isIt = (d: unknown) => (d as { id: string }).id === secret.id;
    const update = await anGateway.next('CHANNEL_UPDATE', isIt);
    await chiGateway.next('CHANNEL_DELETE', isIt);
    anGateway.close();
    chiGateway.close();

    expect(update.d).toMatchObject({
      permission_overwrites: [ow(server.id, 0n, P.VIEW_CHANNEL)],
    });
    expect(await channelOf(chi, server.id, secret.id)).toBeUndefined();
  });

  it('turning sync on is 40301 when it would drop an overwrite of a role level with or above you', async () => {
    const an = await signedIn();
    const tuan = await signedIn();
    const server = await serverOf(an, tuan);
    const admin = await addRole(server.id, 'Quản trị', 2, P.MANAGE_CHANNELS, [
      tuan,
    ]);
    await an
      .patch(byId(server.text.id))
      .send({ permissions_synced: false })
      .expect(200);
    await put(an, server.text.id, ow(admin, 0n, P.SEND_MESSAGES)).expect(200);

    const res = await tuan
      .patch(byId(server.text.id))
      .send({ permissions_synced: true });
    expect(res.body.code).toBe(ErrorCode.InsufficientRoleHierarchy);
    await an
      .patch(byId(server.text.id))
      .send({ permissions_synced: true })
      .expect(200);
  });

  it("deleting a role a category allowed VIEW_CHANNEL also re-sends the category's synced channels", async () => {
    const an = await signedIn();
    const chi = await signedIn();
    const server = await serverOf(an, chi);
    const mod = await addRole(server.id, 'Mod', 1, 0n, [chi]);
    await put(an, server.category.id, ow(server.id, 0n, P.VIEW_CHANNEL)).expect(
      200,
    );
    await put(an, server.category.id, ow(mod, P.VIEW_CHANNEL, 0n)).expect(200);
    const gateway = await connectGateway(app, chi.token);

    await an
      .delete(RoleRoutes.byId.replace(':id', server.id).replace(':roleId', mod))
      .expect(204);
    await gateway.next(
      'CHANNEL_DELETE',
      (d) => (d as { id: string }).id === server.text.id,
    );
    gateway.close();
  });

  it('the Study Server template starts #thong-bao with @everyone deny SEND_MESSAGES, not synced (8.5.3)', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const ids = app.get(SnowflakeGenerator);
    const rows = buildServer('study_server', {
      name: 'Ôn thi Giải tích 2',
      ownerId: an.userId,
      now: new Date(),
      nextId: () => ids.next(),
    });
    await app.get(ServersRepository).create(rows, 100);
    const serverId = rows.server.id!.toString();
    await db
      .insert(serverMembers)
      .values({ serverId: BigInt(serverId), userId: binh.userId });

    const news = (await channelsOf(binh, serverId)).find(
      (c) => c.name === 'thong-bao',
    )!;
    expect(news).toMatchObject({
      permissions_synced: false,
      permission_overwrites: [ow(serverId, 0n, P.SEND_MESSAGES)],
    });
    expect(await can(binh, news.id, P.SEND_MESSAGES)).toBe(false);
    expect(await can(an, news.id, P.SEND_MESSAGES)).toBe(true);
  });
});
