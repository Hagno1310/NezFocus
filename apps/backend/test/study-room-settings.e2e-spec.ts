import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ChannelRoutes,
  ErrorCode,
  Permission as P,
  ServerRoutes,
  type ChannelResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import {
  STUDY_ROOM_DISABLED,
  type StudyRoomDisabled,
} from '../src/modules/servers/study-room-events.js';
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

// REQ-STUDY-11 (Cài đặt Phòng học), STUDY-01 AC6 / AC8 data, CR-28 #37 with the real
// PermissionService, Postgres and the Gateway. Needs `pnpm dev:infra`.
describe('Study Room settings (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const disabled: StudyRoomDisabled[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    db = app.get(DB);
    app
      .get(EventEmitter2)
      .on(STUDY_ROOM_DISABLED, (e: StudyRoomDisabled) => disabled.push(e));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    disabled.length = 0;
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
      patch: (path: string) => api.patch(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An's general server ("Kênh chung" › #general, Phòng thoại chung) with these members.
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
    const of = (type: string) => server.channels.find((c) => c.type === type)!;
    return { id: server.id, text: of('text'), voice: of('voice') };
  };

  // "Điều phối phòng học" (spec 08 › Dữ liệu mẫu): only MANAGE_STUDY_ROOMS.
  const giveRole = async (serverId: string, bits: bigint, holder: Me) => {
    const id = app.get(SnowflakeGenerator).next();
    await db.insert(roles).values({
      id,
      serverId: BigInt(serverId),
      name: 'Điều phối phòng học',
      position: 1,
      permissions: bits,
    });
    await db.insert(serverMemberRoles).values({
      serverId: BigInt(serverId),
      userId: holder.userId,
      roleId: id,
    });
    await app.get(PermissionCache).invalidateServer(BigInt(serverId));
  };

  const channelOf = async (me: Me, serverId: string, channelId: string) =>
    ((await me.get(list(serverId)).expect(200)).body as ChannelResponse[]).find(
      (c) => c.id === channelId,
    )!;

  it('a voice channel without its own cycle reads 25/5; a text channel has none', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    expect(server.voice.default_cycle_config).toEqual({
      focus_min: 25,
      short_break_min: 5,
    });
    expect(server.text.default_cycle_config).toBeNull();
  });

  it('AC8 (STUDY-11): MANAGE_STUDY_ROOMS alone changes Focus control and the cycle, never the name', async () => {
    const an = await signedIn();
    const chi = await signedIn();
    const server = await serverOf(an, chi);
    await giveRole(server.id, P.MANAGE_STUDY_ROOMS, chi);

    const rename = await chi
      .patch(byId(server.voice.id))
      .send({ name: 'Phòng học buổi tối' });
    expect([rename.status, rename.body.code]).toEqual([
      403,
      ErrorCode.Forbidden,
    ]);
    // Mixed with a Phòng học field: the whole request is refused, nothing saved.
    await chi
      .patch(byId(server.voice.id))
      .send({ name: 'Phòng học buổi tối', focus_control: 'everyone' })
      .expect(403);
    expect(await channelOf(an, server.id, server.voice.id)).toMatchObject({
      name: server.voice.name,
      focus_control: 'off',
    });

    const saved = (
      await chi
        .patch(byId(server.voice.id))
        .send({
          focus_control: 'managers',
          default_cycle_config: {
            focus_min: 45,
            short_break_min: 10,
            long_break_min: 20,
            long_break_every: 4,
          },
        })
        .expect(200)
    ).body as ChannelResponse;
    expect(saved).toMatchObject({
      focus_control: 'managers',
      default_cycle_config: {
        focus_min: 45,
        short_break_min: 10,
        long_break_min: 20,
        long_break_every: 4,
      },
    });
    expect(await channelOf(an, server.id, server.voice.id)).toEqual(saved);
  });

  it('a member with neither MANAGE_CHANNELS nor MANAGE_STUDY_ROOMS → 40302', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    const r = await binh
      .patch(byId(server.voice.id))
      .send({ focus_control: 'everyone' });
    expect([r.status, r.body.code]).toEqual([403, ErrorCode.Forbidden]);
  });

  it('MANAGE_STUDY_ROOMS does not reach a text channel', async () => {
    const an = await signedIn();
    const chi = await signedIn();
    const server = await serverOf(an, chi);
    await giveRole(server.id, P.MANAGE_STUDY_ROOMS, chi);
    await chi
      .patch(byId(server.text.id))
      .send({ focus_control: 'everyone' })
      .expect(403);
  });

  it('STUDY-01 AC6: a default cycle of focus 200 minutes → 40001', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    const r = await an
      .patch(byId(server.voice.id))
      .send({ default_cycle_config: { focus_min: 200, short_break_min: 5 } });
    expect([r.status, r.body.code]).toEqual([400, ErrorCode.ValidationError]);
  });

  it('CR-28 #37: Phòng học fields on a text channel → 40001', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    for (const body of [
      { focus_control: 'everyone' },
      { default_cycle_config: { focus_min: 50, short_break_min: 10 } },
    ]) {
      const r = await an.patch(byId(server.text.id)).send(body);
      expect([r.status, r.body.code]).toEqual([400, ErrorCode.ValidationError]);
    }
  });

  it('STUDY-01 AC8 (data): off makes it a plain voice channel for everyone', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    await an
      .patch(byId(server.voice.id))
      .send({ focus_control: 'everyone' })
      .expect(200);
    await an
      .patch(byId(server.voice.id))
      .send({ focus_control: 'off' })
      .expect(200);
    expect(
      (await channelOf(binh, server.id, server.voice.id)).focus_control,
    ).toBe('off');
  });

  it('CR-28 #37: CHANNEL_UPDATE names who changed it', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const server = await serverOf(an, binh);
    const gateway = await connectGateway(app, binh.token);

    await an
      .patch(byId(server.voice.id))
      .send({ focus_control: 'everyone' })
      .expect(200);
    const update = await gateway.next('CHANNEL_UPDATE');
    gateway.close();
    expect(update.d).toMatchObject({
      id: server.voice.id,
      focus_control: 'everyone',
      updated_by: an.id,
    });
  });

  it('STUDY-11: turning a Phòng học off tells the Room Session side once; other changes do not', async () => {
    const an = await signedIn();
    const server = await serverOf(an);
    const patch = (focus_control: string) =>
      an.patch(byId(server.voice.id)).send({ focus_control }).expect(200);

    await patch('everyone');
    await patch('managers');
    expect(disabled).toEqual([]);
    await patch('off');
    await patch('off'); // already off: nothing to end
    expect(disabled).toEqual([
      {
        serverId: BigInt(server.id),
        channelId: BigInt(server.voice.id),
        byUserId: an.userId,
      },
    ]);
  });
});
