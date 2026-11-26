import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthRoutes,
  ChannelRoutes,
  ErrorCode,
  GatewayOp,
  MemberRoutes,
  Permission as P,
  ServerRoutes,
  VoiceRoutes,
  type ChannelResponse,
  type PresenceEvent,
  type ServerResponse,
  type VoiceRoomMember,
  type VoiceState,
} from '@nezfocus/shared';
import { and, eq, sql } from 'drizzle-orm';
import { decodeJwt } from 'jose';
import { AccessToken } from 'livekit-server-sdk';
import { createHash } from 'node:crypto';
import { DB, type Db } from '../src/db/db.module.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import {
  roles,
  serverMemberRoles,
  serverMembers,
} from '../src/modules/servers/servers.schema.js';
import {
  LiveKitRooms,
  type Publishable,
} from '../src/modules/voice/livekit.js';
import { VoiceService } from '../src/modules/voice/voice.service.js';
import {
  CapturingMailer,
  completion,
  connectGateway,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const isState = (where: Partial<VoiceState>) => (d: unknown) =>
  Object.entries(where).every(
    ([k, v]) => (d as Record<string, unknown>)[k] === v,
  );

// Dev keys of apps/backend/.env.example / infra/livekit (the defaults of config/env.ts).
const KEY = 'devkey';
const SECRET = 'dev-only-livekit-secret-0123456789abcdef';

// REQ-VC-01 / STUDY-02 / VC-04 AC5 (backend), SRS 5.3 Voice, 5.4, 5.5. Real Postgres + Redis;
// LiveKit's Server API is recorded (joining a real SFU is checked by hand with livekit-cli).
describe('Voice (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const removed: string[] = [];
  const liveKit: string[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(LiveKitRooms).useValue({
        remove: async (room: string, identity: string) =>
          void removed.push(`${room}/${identity}`),
        close: async () => {},
        setPublish: async (room: string, identity: string, p: Publishable) =>
          void liveKit.push(`publish ${room}/${identity} mic=${p.mic}`),
        muteMic: async (room: string, identity: string) =>
          void liveKit.push(`mute ${room}/${identity}`),
      }),
    ));
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const signedIn = async (name: string) => {
    const email = uniqueEmail();
    const session = await signInWithCode(app, mailer, email);
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send({ ...completion(uniqueUsername()), display_name: name })
      .expect(200);
    const as = (token: string) => ({
      token,
      post: (path: string) =>
        http(app).post(path).auth(token, { type: 'bearer' }),
      put: (path: string) =>
        http(app).put(path).auth(token, { type: 'bearer' }),
      patch: (path: string) =>
        http(app).patch(path).auth(token, { type: 'bearer' }),
    });
    return {
      id: session.user.id,
      userId: BigInt(session.user.id),
      ...as(session.access_token),
      // The same account on a second phone.
      anotherDevice: async () => {
        const res = await http(app)
          .post(AuthRoutes.login)
          .set('X-Forwarded-For', `198.18.0.${Math.floor(Math.random() * 200)}`)
          .send({ email, password: 'Ontap2026!', device: device() })
          .expect(200);
        return as((res.body as { access_token: string }).access_token);
      },
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // An owns "Ôn thi Giải tích 2" (template: a voice room); Bình is a member.
  const room = async () => {
    const [an, binh] = await Promise.all([signedIn('An'), signedIn('Bình')]);
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db
      .insert(serverMembers)
      .values({ serverId: BigInt(server.id), userId: binh.userId });
    const voice = server.channels.find((c) => c.type === 'voice')!;
    const text = server.channels.find((c) => c.type === 'text')!;
    return { an, binh, server, voice, text };
  };

  // @everyone loses these bits server-wide (the Owner keeps everything).
  const deny = async (server: ServerResponse, bits: bigint) => {
    await db
      .update(roles)
      .set({ permissions: sql`${roles.permissions} & ${~bits}` })
      .where(eq(roles.id, BigInt(server.id)));
    await app.get(PermissionCache).invalidateServer(BigInt(server.id));
  };

  const grantOf = async (me: Me, channelId: string) => {
    const res = await me
      .post(VoiceRoutes.token)
      .send({ channel_id: channelId })
      .expect(200);
    const body = res.body as { token: string; url: string };
    return { ...body, claims: decodeJwt(body.token) };
  };

  const second = 1;
  const join = (
    gw: Awaited<ReturnType<typeof connectGateway>>,
    channelId: string | null,
  ) =>
    gw.send(GatewayOp.VOICE_STATE_UPDATE, {
      channel_id: channelId,
      self_mute: true,
      self_video: false,
    });

  const signedWebhook = async (event: object) => {
    const createdAt = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ createdAt, ...event });
    const at = new AccessToken(KEY, SECRET);
    at.sha256 = createHash('sha256').update(body).digest('base64');
    return http(app)
      .post(VoiceRoutes.webhook)
      .set('Content-Type', 'application/webhook+json')
      .set('Authorization', await at.toJwt())
      .send(body);
  };

  describe('POST /voice/token (VC-01, SRS 5.5)', () => {
    it('signs one room for 10 minutes, identity = user id, mic and camera, no data', async () => {
      const { binh, voice } = await room();
      const { url, claims } = await grantOf(binh, voice.id);
      // Whatever this machine's .env says (a phone test sets the LAN IP).
      expect(url).toBe(app.get(ConfigService).get('LIVEKIT_URL'));
      expect(claims.sub).toBe(binh.id);
      const ttl = claims.exp! - Date.now() / 1000;
      expect(ttl).toBeGreaterThan(590);
      expect(ttl).toBeLessThanOrEqual(600);
      expect(claims.video).toMatchObject({
        roomJoin: true,
        room: `voice:${voice.id}`,
        canPublish: true,
        canPublishSources: ['microphone', 'camera'],
        canSubscribe: true,
        canPublishData: false,
      });
    });

    it('AC2 (âm): no CONNECT → 40302, and so when timed out (8.5.2 step 5)', async () => {
      const { binh, server, voice } = await room();
      await deny(server, P.CONNECT);
      const res = await binh
        .post(VoiceRoutes.token)
        .send({ channel_id: voice.id });
      expect(res.body.code).toBe(ErrorCode.Forbidden);

      const other = await room();
      await db
        .update(serverMembers)
        .set({ timeoutUntil: new Date(Date.now() + 3600_000) })
        .where(eq(serverMembers.userId, other.binh.userId));
      const timedOut = await other.binh
        .post(VoiceRoutes.token)
        .send({ channel_id: other.voice.id });
      expect(timedOut.body.code).toBe(ErrorCode.Forbidden);
    });

    it('a text channel, a call (until P3-B6.2), neither or both → 40401 / 40001', async () => {
      const { binh, voice, text } = await room();
      for (const [body, code] of [
        [{ channel_id: text.id }, ErrorCode.NotFound],
        [{ call_id: voice.id }, ErrorCode.NotFound],
        [{}, ErrorCode.ValidationError],
        [
          { channel_id: voice.id, call_id: voice.id },
          ErrorCode.ValidationError,
        ],
      ] as const)
        expect((await binh.post(VoiceRoutes.token).send(body)).body.code).toBe(
          code,
        );
    });

    it('no SPEAK → no mic; mod-muted in the server → no mic (VC-04 AC5)', async () => {
      const { binh, server, voice } = await room();
      await deny(server, P.SPEAK);
      expect((await grantOf(binh, voice.id)).claims.video).toMatchObject({
        canPublishSources: ['camera'],
      });

      const other = await room();
      await db
        .update(serverMembers)
        .set({ modMuted: true })
        .where(
          and(
            eq(serverMembers.serverId, BigInt(other.server.id)),
            eq(serverMembers.userId, other.binh.userId),
          ),
        );
      expect(
        (await grantOf(other.binh, other.voice.id)).claims.video,
      ).toMatchObject({
        canPublishSources: ['camera'],
      });
    });
  });

  describe('op 4 and VOICE_STATE_UPDATE (SRS 5.4, CR-28 #30)', () => {
    it('joining shows the seat to viewers and in READY; leaving tells my device why', async () => {
      const { an, binh, voice } = await room();
      const anGw = await connectGateway(app, an.token);
      const binhGw = await connectGateway(app, binh.token);
      join(binhGw, voice.id);
      const seat = (
        await anGw.next('VOICE_STATE_UPDATE', isState({ user_id: binh.id }))
      ).d as VoiceState;
      expect(seat).toMatchObject({
        channel_id: voice.id,
        self_mute: true,
        self_video: false,
        mod_muted: false,
        away: false,
      });

      const later = await connectGateway(app, an.token);
      expect(
        (later.ready() as { voice_states: VoiceRoomMember[] }).voice_states,
      ).toEqual([
        expect.objectContaining({ user_id: binh.id, channel_id: voice.id }),
      ]);

      join(binhGw, null);
      await anGw.next(
        'VOICE_STATE_UPDATE',
        isState({ user_id: binh.id, channel_id: null }),
      );
      await binhGw.next('VOICE_STATE_UPDATE', isState({ reason: 'left' }));
      expect(removed).toContain(`voice:${voice.id}/${binh.id}`);
      for (const gw of [anGw, binhGw, later]) gw.close();
    });

    it('nobody without VIEW_CHANNEL hears about the room', async () => {
      const { an, binh, server, voice } = await room();
      await deny(server, P.VIEW_CHANNEL);
      const binhGw = await connectGateway(app, binh.token);
      const anGw = await connectGateway(app, an.token);
      join(anGw, voice.id);
      await anGw.next('VOICE_STATE_UPDATE', isState({ user_id: an.id }));
      await new Promise((r) => setTimeout(r, 300 * second));
      expect(
        binhGw.dispatches.filter((x) => x.t === 'VOICE_STATE_UPDATE'),
      ).toEqual([]);
      anGw.close();
      binhGw.close();
    });

    it('one voice per account: another room on this phone is a switch, on another phone it ends the old one', async () => {
      const { an, binh, server, voice } = await room();
      const second = (
        await an
          .post(ChannelRoutes.list.replace(':id', server.id))
          .send({ name: 'Phòng thảo luận nhóm', type: 'voice' })
          .expect(201)
      ).body as ChannelResponse;
      const phone = await connectGateway(app, binh.token);
      join(phone, voice.id);
      await phone.next('VOICE_STATE_UPDATE', isState({ channel_id: voice.id }));
      join(phone, second.id);
      await phone.next('VOICE_STATE_UPDATE', isState({ reason: 'switched' }));

      const tablet = await connectGateway(
        app,
        (await binh.anotherDevice()).token,
      );
      join(tablet, voice.id);
      await phone.next(
        'VOICE_STATE_UPDATE',
        isState({ reason: 'other_device' }),
      );
      await tablet.next(
        'VOICE_STATE_UPDATE',
        isState({ channel_id: voice.id }),
      );
      expect(
        tablet.dispatches.some((x) => isState({ reason: 'other_device' })(x.d)),
      ).toBe(false);
      expect(removed).toContain(`voice:${second.id}/${binh.id}`);
      phone.close();
      tablet.close();
    });
  });

  describe('LiveKit webhook (SRS 5.5)', () => {
    it('refuses a bad signature with 40100', async () => {
      const res = await http(app)
        .post(VoiceRoutes.webhook)
        .set('Content-Type', 'application/webhook+json')
        .set('Authorization', 'nope')
        .send('{"event":"room_finished"}');
      expect(res.body.code).toBe(ErrorCode.TokenInvalid);
    });

    it('a dropped connection keeps the seat as away; coming back clears it (VC-01)', async () => {
      const { an, binh, voice } = await room();
      const anGw = await connectGateway(app, an.token);
      const binhGw = await connectGateway(app, binh.token);
      join(binhGw, voice.id);
      await anGw.next(
        'VOICE_STATE_UPDATE',
        isState({ user_id: binh.id, away: false }),
      );
      const seats0 = anGw.dispatches.find(
        (x) => x.t === 'VOICE_STATE_UPDATE',
      )?.d;
      const who = { name: `voice:${voice.id}` };
      expect(
        (
          await signedWebhook({
            event: 'participant_left',
            room: who,
            participant: {
              identity: binh.id,
              disconnectReason: 'SIGNAL_CLOSE',
            },
          })
        ).status,
      ).toBe(204);
      await anGw.next(
        'VOICE_STATE_UPDATE',
        isState({ user_id: binh.id, away: true }),
      );
      expect(await app.get(VoiceService).seatOf(binh.userId)).not.toBeNull();

      expect(
        (
          await signedWebhook({
            event: 'participant_joined',
            room: who,
            participant: { identity: binh.id },
          })
        ).status,
      ).toBe(204);
      await anGw.next(
        'VOICE_STATE_UPDATE',
        (d) => isState({ user_id: binh.id, away: false })(d) && d !== seats0,
      );
      const seats = anGw.dispatches
        .filter((x) => x.t === 'VOICE_STATE_UPDATE')
        .map((x) => x.d as VoiceState)
        .filter((d) => d.user_id === binh.id);
      expect(seats.map((d) => d.away)).toEqual([false, true, false]);
      anGw.close();
      binhGw.close();
    });
  });

  describe('presence (AUTH-05, CR-24)', () => {
    const activityOf = (who: string) => (d: unknown) =>
      (d as PresenceEvent).user_id === who &&
      (d as PresenceEvent).activity?.kind === 'voice';

    it('"Đang ở {phòng}" to who can view the room, else a room with no name', async () => {
      const { an, binh, server, voice } = await room();
      const binhGw = await connectGateway(app, binh.token);
      const anGw = await connectGateway(app, an.token);
      join(binhGw, voice.id);
      const seen = (await anGw.next('PRESENCE_UPDATE', activityOf(binh.id)))
        .d as PresenceEvent;
      expect(seen.activity).toEqual({
        kind: 'voice',
        room: {
          channel_id: voice.id,
          server_id: server.id,
          channel_name: voice.name,
          study_room: false,
        },
      });
      join(binhGw, null);
      await anGw.next(
        'PRESENCE_UPDATE',
        (d) =>
          (d as PresenceEvent).user_id === binh.id &&
          !(d as PresenceEvent).activity,
      );

      await deny(server, P.VIEW_CHANNEL);
      join(anGw, voice.id);
      const hidden = (await binhGw.next('PRESENCE_UPDATE', activityOf(an.id)))
        .d as PresenceEvent;
      expect(hidden.activity).toEqual({ kind: 'voice', room: null });
      anGw.close();
      binhGw.close();
    });
  });

  describe('leaving without "Rời phòng" (VC-01, CR-28 #32)', () => {
    it('signing out leaves the room now', async () => {
      const { an, binh, voice } = await room();
      const anGw = await connectGateway(app, an.token);
      const binhGw = await connectGateway(app, binh.token);
      join(binhGw, voice.id);
      await anGw.next('VOICE_STATE_UPDATE', isState({ user_id: binh.id }));
      await binh.post(AuthRoutes.logout).expect(204);
      await anGw.next(
        'VOICE_STATE_UPDATE',
        isState({ user_id: binh.id, channel_id: null }),
      );
      expect(await app.get(VoiceService).seatOf(binh.userId)).toBeNull();
      anGw.close();
    });

    it('deleting the voice channel puts everyone out with channel_deleted', async () => {
      const { an, binh, voice } = await room();
      const binhGw = await connectGateway(app, binh.token);
      join(binhGw, voice.id);
      await binhGw.next(
        'VOICE_STATE_UPDATE',
        isState({ channel_id: voice.id }),
      );
      await http(app)
        .delete(ChannelRoutes.byId.replace(':id', voice.id))
        .auth(an.token, { type: 'bearer' })
        .expect(204);
      await binhGw.next(
        'VOICE_STATE_UPDATE',
        isState({ reason: 'channel_deleted' }),
      );
      expect(await app.get(VoiceService).seatOf(binh.userId)).toBeNull();
      binhGw.close();
    });
  });

  describe('PATCH …/members/:userId/voice (VC-04, CR-28 #31)', () => {
    let nextRole = 0n;
    // Chi moderates: one role at position 1 with these bits (An owns, Bình has no role).
    const moderated = async (bits = P.MUTE_MEMBERS | P.MOVE_MEMBERS) => {
      const r = await room();
      const chi = await signedIn('Chi');
      const serverId = BigInt(r.server.id);
      const roleId = BigInt(Date.now()) * 4_194_304n + nextRole++;
      await db.insert(serverMembers).values({ serverId, userId: chi.userId });
      await db.insert(roles).values({
        id: roleId,
        serverId,
        name: 'Điều hành',
        permissions: bits,
        position: 1,
      });
      await db
        .insert(serverMemberRoles)
        .values({ serverId, userId: chi.userId, roleId });
      await app.get(PermissionCache).invalidateServer(serverId);
      const voiceOf = (userId: string) =>
        MemberRoutes.voice
          .replace(':id', r.server.id)
          .replace(':userId', userId);
      return { ...r, chi, roleId, voiceOf };
    };

    it('AC1: mute in a room → LiveKit takes the mic away, the room sees mod_muted; un-mute gives it back', async () => {
      const { binh, chi, voice, voiceOf } = await moderated();
      const gw = await connectGateway(app, binh.token);
      join(gw, voice.id);
      await gw.next('VOICE_STATE_UPDATE', isState({ channel_id: voice.id }));
      await chi.patch(voiceOf(binh.id)).send({ mute: true }).expect(204);
      await gw.next(
        'VOICE_STATE_UPDATE',
        isState({ user_id: binh.id, mod_muted: true }),
      );
      expect(liveKit).toContain(
        `publish voice:${voice.id}/${binh.id} mic=false`,
      );
      expect(liveKit).toContain(`mute voice:${voice.id}/${binh.id}`);
      await chi.patch(voiceOf(binh.id)).send({ mute: false }).expect(204);
      await gw.next(
        'VOICE_STATE_UPDATE',
        isState({ user_id: binh.id, mod_muted: false }),
      );
      expect(liveKit).toContain(
        `publish voice:${voice.id}/${binh.id} mic=true`,
      );
      gw.close();
    });

    it('AC5: a mute given out of a room holds: the next token has no mic', async () => {
      const { binh, chi, voice, voiceOf } = await moderated();
      await chi.patch(voiceOf(binh.id)).send({ mute: true }).expect(204);
      const { claims } = await grantOf(binh, voice.id);
      expect(claims.video).toMatchObject({ canPublishSources: ['camera'] });
    });

    it('disconnect: out at once with disconnected_by_mod; not in a room → 204, nothing', async () => {
      const { binh, chi, voice, voiceOf } = await moderated();
      const before = removed.length;
      await chi.patch(voiceOf(binh.id)).send({ disconnect: true }).expect(204);
      expect(removed).toHaveLength(before);
      const gw = await connectGateway(app, binh.token);
      join(gw, voice.id);
      await gw.next('VOICE_STATE_UPDATE', isState({ channel_id: voice.id }));
      await chi.patch(voiceOf(binh.id)).send({ disconnect: true }).expect(204);
      await gw.next(
        'VOICE_STATE_UPDATE',
        isState({ reason: 'disconnected_by_mod' }),
      );
      expect(removed).toContain(`voice:${voice.id}/${binh.id}`);
      expect(await app.get(VoiceService).seatOf(binh.userId)).toBeNull();
      gw.close();
    });

    it('AC2 (âm): no MUTE_MEMBERS → 40302; no MOVE_MEMBERS to disconnect → 40302', async () => {
      const mover = await moderated(P.MOVE_MEMBERS);
      const mute = await mover.chi
        .patch(mover.voiceOf(mover.binh.id))
        .send({ mute: true })
        .expect(403);
      expect(mute.body.code).toBe(ErrorCode.Forbidden);
      const muter = await moderated(P.MUTE_MEMBERS);
      const out = await muter.chi
        .patch(muter.voiceOf(muter.binh.id))
        .send({ disconnect: true })
        .expect(403);
      expect(out.body.code).toBe(ErrorCode.Forbidden);
    });

    it('AC2 (âm): someone level with or above, or the Owner → 40301', async () => {
      const { an, binh, chi, server, roleId, voiceOf } = await moderated();
      await db
        .insert(serverMemberRoles)
        .values({ serverId: BigInt(server.id), userId: binh.userId, roleId });
      await app.get(PermissionCache).invalidateServer(BigInt(server.id));
      for (const target of [binh.id, an.id]) {
        const res = await chi
          .patch(voiceOf(target))
          .send({ mute: true })
          .expect(403);
        expect(res.body.code).toBe(ErrorCode.InsufficientRoleHierarchy);
      }
    });

    it('a body with neither → 40001; someone not in the server → 40401', async () => {
      const { an, chi, voiceOf } = await moderated();
      await chi.patch(voiceOf(an.id)).send({}).expect(400);
      const stranger = await signedIn('Lạ');
      const res = await chi.patch(voiceOf(stranger.id)).send({ mute: true });
      expect(res.body.code).toBe(ErrorCode.NotFound);
    });
  });

  describe('VoiceService (ROLE-05 AC4, SRV-05 AC5 for #126 / #130)', () => {
    it('disconnects only inside the scope, telling the device why', async () => {
      const { binh, server, voice } = await room();
      const gw = await connectGateway(app, binh.token);
      join(gw, voice.id);
      await gw.next('VOICE_STATE_UPDATE', isState({ channel_id: voice.id }));
      const voiceService = app.get(VoiceService);
      expect(
        await voiceService.disconnect(binh.userId, { serverId: 1n }, 'kicked'),
      ).toBe(false);
      expect(await voiceService.seatOf(binh.userId)).toEqual({
        serverId: BigInt(server.id),
        channelId: BigInt(voice.id),
      });
      expect(
        await voiceService.disconnect(
          binh.userId,
          { serverId: BigInt(server.id) },
          'kicked',
        ),
      ).toBe(true);
      await gw.next('VOICE_STATE_UPDATE', isState({ reason: 'kicked' }));
      expect(await voiceService.seatOf(binh.userId)).toBeNull();
      gw.close();
    });
  });
});
