import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ChannelRoutes,
  ErrorCode,
  FocusSessionRoutes,
  Permission as P,
  ServerRoutes,
  SoloRoutes,
  type FocusSessionEnd,
  type FocusSessionResponse,
  type ServerResponse,
  type VoiceLeaveReason,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { Clock, fixedClock } from '../src/common/clock.js';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import {
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
} from '../src/modules/servers/servers.schema.js';
import {
  focusSessionParticipations,
  focusSessions,
} from '../src/modules/study/focus.schema.js';
import {
  RoomScheduler,
  RoomSessionService,
} from '../src/modules/study/room-session.service.js';
import { soloSessions } from '../src/modules/study/solo.schema.js';
import { LiveKitRooms } from '../src/modules/voice/livekit.js';
import { VOICE_JOINED } from '../src/modules/voice/voice-events.js';
import { VoiceRoomsService } from '../src/modules/voice/voice-rooms.service.js';
import { VoiceSeats } from '../src/modules/voice/voice-seats.js';
import { StudyRoomQuery } from '../src/modules/study/study-room.query.js';
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

type Sent = {
  to: 'user' | 'channel';
  id: bigint;
  t: string;
  d: unknown;
  except?: readonly bigint[];
};

const MIN = 60;
const P25 = { cycle_config: { focus_min: 25, short_break_min: 5 } };
const start = (channelId: string) =>
  FocusSessionRoutes.start.replace(':id', channelId);
const byId = (id: string) => FocusSessionRoutes.byId.replace(':id', id);

// REQ-STUDY-01, STUDY-11 (backend), STUDY-10 AC8 / AC9, CR-28 #38 through REST, Postgres and Redis
// seats; the phase rules are unit-tested in room-machine. Jobs are run by hand. Needs `pnpm dev:infra`.
describe('Room Session (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let rooms: RoomSessionService;
  // Whole seconds: a stretch split at local midnight keeps every second (each day rounds down).
  const clock = fixedClock(new Date(Math.floor(Date.now() / 1000) * 1000));
  const sent: Sent[] = [];
  const jobs: string[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b
        .overrideProvider(Clock)
        .useValue(clock)
        .overrideProvider(EventPublisher)
        .useValue({
          toUser: async (id: bigint, t: string, d: unknown) =>
            void sent.push({ to: 'user', id, t, d }),
          toChannel: async (
            id: bigint,
            t: string,
            d: unknown,
            except?: readonly bigint[],
          ) => void sent.push({ to: 'channel', id, t, d, except }),
          toLogin: async () => {},
          toServer: async () => {},
          toServerSubscribers: async () => {},
        })
        .overrideProvider(RoomScheduler)
        .useValue({
          tick: async (id: bigint, at: Date) =>
            void jobs.push(`tick ${id} ${at.toISOString()}`),
          emptyCheck: async (id: bigint, since: Date) =>
            void jobs.push(`empty ${id} ${since.toISOString()}`),
        })
        .overrideProvider(LiveKitRooms)
        .useValue({ remove: async () => {}, close: async () => {} }),
    ));
    db = app.get(DB);
    rooms = app.get(RoomSessionService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    sent.length = 0;
    jobs.length = 0;
  });

  const signedIn = async (name: string) => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const auth = { type: 'bearer' as const };
    const api = http(app);
    const token = session.access_token;
    await api
      .post('/auth/complete-account')
      .auth(token, auth)
      .send({ ...completion(uniqueUsername()), display_name: name })
      .expect(200);
    return {
      id: session.user.id,
      userId: BigInt(session.user.id),
      post: (path: string) => api.post(path).auth(token, auth),
      patch: (path: string) => api.patch(path).auth(token, auth),
      del: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // "Phòng học im lặng": An's voice room, a Phòng học (`focus_control`), with these members.
  const studyRoom = async (
    members: number,
    focusControl: 'everyone' | 'managers' | 'off' = 'everyone',
  ) => {
    const people = await Promise.all(
      ['An', 'Bình', 'Chi', 'Dũng', 'Em'].slice(0, members).map(signedIn),
    );
    const [an, ...rest] = people;
    const server = (
      await an!
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    if (rest.length)
      await db.insert(serverMembers).values(
        rest.map((m) => ({
          serverId: BigInt(server.id),
          userId: m.userId,
        })),
      );
    const voice = server.channels.find((c) => c.type === 'voice')!;
    await db
      .update(channels)
      .set({ focusControl })
      .where(eq(channels.id, BigInt(voice.id)));
    return { people, server, voice, channelId: BigInt(voice.id) };
  };

  // A seat as op 4 leaves it, and the in-process event Room Sessions follow.
  const sit = async (
    me: Me,
    room: { server: ServerResponse; voice: { id: string } },
  ) => {
    const seat = {
      userId: me.userId,
      channelId: BigInt(room.voice.id),
      serverId: BigInt(room.server.id),
      authSessionId: app.get(SnowflakeGenerator).next(),
      selfMute: true,
      selfVideo: false,
      joinedAt: clock.now().getTime(),
      saidAt: clock.now().getTime(),
      awayUntil: null,
    };
    await app.get(VoiceSeats).put(seat);
    await app
      .get(EventEmitter2)
      .emitAsync(VOICE_JOINED, { ...seat, at: clock.now() });
  };
  const leave = (me: Me, reason: VoiceLeaveReason = 'left') =>
    app.get(VoiceService).disconnect(me.userId, 'any', reason);
  // LiveKit lost them (VC-01): the seat stays 3 minutes, away; back = away cleared, no new join.
  const goAway = async (me: Me) => {
    const seat = (await app.get(VoiceSeats).get(me.userId))!;
    await app
      .get(VoiceSeats)
      .put({ ...seat, awayUntil: clock.now().getTime() + 3 * MIN * 1000 });
  };
  const comeBack = async (me: Me) => {
    const seat = (await app.get(VoiceSeats).get(me.userId))!;
    await app.get(VoiceSeats).put({ ...seat, awayUntil: null });
  };
  const seconds = async (sessionId: bigint, me: Me) =>
    (await partsOf(sessionId))
      .filter((p) => p.userId === me.userId)
      .reduce((n, p) => n + p.focusedSeconds, 0);
  const hostOf = async (sessionId: bigint) =>
    (
      await db
        .select({ hostId: focusSessions.hostId })
        .from(focusSessions)
        .where(eq(focusSessions.id, sessionId))
    )[0]!.hostId;

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

  // Four people in the room, An starts 25/5.
  const running = async (
    members = 4,
    focusControl?: 'everyone' | 'managers',
  ) => {
    const room = await studyRoom(members, focusControl);
    // One second apart, in order: "who sat longest" (STUDY-11 AC2) is then An, Bình, Chi…
    for (const p of room.people) {
      await sit(p, room);
      clock.advance(1);
    }
    const res = await room.people[0]!.post(start(room.voice.id))
      .send(P25)
      .expect(201);
    const body = res.body as FocusSessionResponse;
    sent.length = 0;
    jobs.length = 0;
    return {
      ...room,
      id: body.focus_session.id,
      sessionId: BigInt(body.focus_session.id),
    };
  };

  const partsOf = (sessionId: bigint) =>
    db
      .select()
      .from(focusSessionParticipations)
      .where(eq(focusSessionParticipations.focusSessionId, sessionId));

  const userCopies = <T>(t: string) =>
    new Map(
      sent
        .filter((s) => s.to === 'user' && s.t === t)
        .map((s) => [s.id, s.d as T]),
    );

  describe('Start (REQ-STUDY-01, STUDY-11)', () => {
    it('AC1: 4 in the room, An starts 25/5 → 4 Participants, An Host; each gets their own `me`', async () => {
      const room = await studyRoom(4);
      for (const p of room.people) await sit(p, room);
      const res = await room.people[0]!.post(start(room.voice.id))
        .send(P25)
        .expect(201);
      const body = res.body as FocusSessionResponse;
      expect(body.focus_session).toMatchObject({
        status: 'running',
        phase: 'focus',
        host_id: room.people[0]!.id,
        last_action: { by: room.people[0]!.id, action: 'start' },
        me: { focused_seconds: 0, counting_since: clock.now().toISOString() },
      });
      expect(Date.parse(body.focus_session.phase_ends_at!)).toBe(
        clock.now().getTime() + 25 * MIN * 1000,
      );
      expect(body.backend_time).toBe(clock.now().toISOString());

      const parts = await partsOf(BigInt(body.focus_session.id));
      expect(parts.map((p) => p.userId).sort()).toEqual(
        room.people.map((p) => p.userId).sort(),
      );
      // CR-28 #38: viewers get the state without `me`, the 4 Participants their own copy.
      const base = sent.find(
        (s) => s.to === 'channel' && s.t === 'FOCUS_SESSION_START',
      )!;
      expect(base.id).toBe(room.channelId);
      expect([...base.except!].sort()).toEqual(
        room.people.map((p) => p.userId).sort(),
      );
      expect((base.d as FocusSessionResponse).focus_session.me).toBeNull();
      expect(userCopies<FocusSessionResponse>('FOCUS_SESSION_START').size).toBe(
        4,
      );
      expect(jobs).toEqual([
        `tick ${body.focus_session.id} ${body.focus_session.phase_ends_at}`,
      ]);
    });

    it('AC2 (âm): a room with a running session → 40903', async () => {
      const room = await running(2);
      const res = await room.people[1]!.post(start(room.voice.id)).send(P25);
      expect(res.body.code).toBe(ErrorCode.FocusSessionAlreadyActive);
    });

    it('AC6 (âm): focus 200 minutes → 40001', async () => {
      const room = await studyRoom(1);
      await sit(room.people[0]!, room);
      const res = await room.people[0]!.post(start(room.voice.id)).send({
        cycle_config: { focus_min: 200, short_break_min: 5 },
      });
      expect(res.body.code).toBe(ErrorCode.ValidationError);
    });

    it('AC8 (âm): focus_control off → 40302; not in the room → 40302 (CR-28 #38)', async () => {
      const off = await studyRoom(1, 'off');
      await sit(off.people[0]!, off);
      expect(
        (await off.people[0]!.post(start(off.voice.id)).send(P25)).body.code,
      ).toBe(ErrorCode.Forbidden);

      const room = await studyRoom(1);
      expect(
        (await room.people[0]!.post(start(room.voice.id)).send(P25)).body.code,
      ).toBe(ErrorCode.Forbidden);
    });

    it('STUDY-11 AC3 (âm): managers, a member starts → 40302; MANAGE_STUDY_ROOMS starts', async () => {
      const room = await studyRoom(3, 'managers');
      const [, binh, chi] = room.people;
      await sit(binh!, room);
      await sit(chi!, room);
      expect((await binh!.post(start(room.voice.id)).send(P25)).body.code).toBe(
        ErrorCode.Forbidden,
      );
      await giveRole(room.server.id, P.MANAGE_STUDY_ROOMS, chi!);
      await chi!.post(start(room.voice.id)).send(P25).expect(201);
    });

    it('a text channel, or a room I cannot see → 40401', async () => {
      const room = await studyRoom(1);
      const text = room.server.channels.find((c) => c.type === 'text')!;
      expect(
        (await room.people[0]!.post(start(text.id)).send(P25)).body.code,
      ).toBe(ErrorCode.NotFound);
    });
  });

  describe('Solo meets the room (REQ-STUDY-10 AC8 / AC9)', () => {
    it('AC8: my Solo running and no end_solo → 40903; with end_solo → Solo ends joined_room, I am Host', async () => {
      const room = await studyRoom(1);
      const [an] = room.people;
      await sit(an!, room);
      await an!.post(SoloRoutes.start).send(P25).expect(201);
      clock.advance(10 * MIN); // under the access token TTL
      const res = await an!.post(start(room.voice.id)).send(P25);
      expect(res.body.code).toBe(ErrorCode.FocusSessionAlreadyActive);

      await an!
        .post(start(room.voice.id))
        .send({ ...P25, end_solo: true })
        .expect(201);
      const [solo] = await db
        .select()
        .from(soloSessions)
        .where(eq(soloSessions.userId, an!.userId));
      expect(solo).toMatchObject({
        endReason: 'joined_room',
        focusedSeconds: 10 * MIN,
      });
    });

    it('AC9: someone else starts → my Solo ends joined_room, I am a Participant', async () => {
      const room = await studyRoom(2);
      const [an, binh] = room.people;
      await sit(an!, room);
      await sit(binh!, room);
      await an!.post(SoloRoutes.start).send(P25).expect(201);
      clock.advance(10 * MIN); // under the access token TTL
      const res = await binh!.post(start(room.voice.id)).send(P25).expect(201);
      const [solo] = await db
        .select()
        .from(soloSessions)
        .where(eq(soloSessions.userId, an!.userId));
      expect(solo!.endReason).toBe('joined_room');
      const parts = await partsOf(
        BigInt((res.body as FocusSessionResponse).focus_session.id),
      );
      expect(parts.map((p) => p.userId)).toContain(an!.userId);
    });
  });

  describe('Controls (REQ-STUDY-11)', () => {
    it('STUDY-01 AC5: pause with 10:00 left, resume 3 minutes later → 10:00; the 15 minutes are credited', async () => {
      const room = await running(2);
      const [an] = room.people;
      clock.advance(15 * MIN);
      const paused = await rooms.act(an!.userId, room.sessionId, {
        action: 'pause',
      });
      expect(paused!.record.state).toMatchObject({
        status: 'paused',
        pausedRemainingMs: 10 * MIN * 1000,
      });
      clock.advance(3 * MIN);
      const resumed = await rooms.act(an!.userId, room.sessionId, {
        action: 'resume',
      });
      expect(resumed!.record.state.phaseEndsAt!.getTime()).toBe(
        clock.now().getTime() + 10 * MIN * 1000,
      );
      const parts = await partsOf(room.sessionId);
      expect(parts.map((p) => p.focusedSeconds)).toEqual([15 * MIN, 15 * MIN]);
      // Every control is an UPDATE naming who did it.
      const copy = userCopies<FocusSessionResponse>('FOCUS_SESSION_UPDATE').get(
        room.people[1]!.userId,
      )!;
      expect(copy.focus_session.last_action).toEqual({
        by: an!.id,
        action: 'resume',
      });
      expect(copy.focus_session.me).toMatchObject({
        focused_seconds: 15 * MIN,
        counting_since: clock.now().toISOString(),
      });
    });

    it('AC1 (âm): a member stops → 40302; AC4: MANAGE_STUDY_ROOMS controls any session', async () => {
      const room = await running(3);
      const [, binh, chi] = room.people;
      expect(
        (await binh!.patch(byId(room.id)).send({ action: 'stop' })).body.code,
      ).toBe(ErrorCode.Forbidden);
      await giveRole(room.server.id, P.MANAGE_STUDY_ROOMS, chi!);
      await chi!.patch(byId(room.id)).send({ action: 'pause' }).expect(200);
    });

    it('AC6: 25/5 → 50/10 at minute 20 keeps 5:00 now, the break after it is 10 minutes', async () => {
      const room = await running(1);
      const [an] = room.people;
      clock.advance(20 * MIN);
      const view = await rooms.act(an!.userId, room.sessionId, {
        action: 'config',
        cycle_config: { focus_min: 50, short_break_min: 10 },
      });
      expect(view!.record.state.phaseEndsAt!.getTime()).toBe(
        clock.now().getTime() + 5 * MIN * 1000,
      );
      clock.advance(5 * MIN);
      await rooms.tick(room.sessionId);
      const [row] = await db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.id, room.sessionId));
      expect(row).toMatchObject({
        phase: 'short_break',
        focusMin: 50,
        shortBreakMin: 10,
        nextCycleConfig: null,
      });
      expect(row!.phaseEndsAt!.getTime()).toBe(
        clock.now().getTime() + 10 * MIN * 1000,
      );
      // The phase end credited the whole 25-minute focus.
      expect((await partsOf(room.sessionId))[0]!.focusedSeconds).toBe(25 * MIN);
    });

    it('AC11: no Host and paused, a member resumes and does not become Host; a second resume does nothing', async () => {
      const room = await running(3);
      const [an, binh, chi] = room.people;
      await an!.patch(byId(room.id)).send({ action: 'pause' }).expect(200);
      await db
        .update(focusSessions)
        .set({ hostId: null })
        .where(eq(focusSessions.id, room.sessionId));
      const res = await binh!
        .patch(byId(room.id))
        .send({ action: 'resume' })
        .expect(200);
      expect((res.body as FocusSessionResponse).focus_session).toMatchObject({
        status: 'running',
        host_id: null,
        last_action: { by: binh!.id, action: 'resume' },
      });
      sent.length = 0;
      await chi!.patch(byId(room.id)).send({ action: 'resume' }).expect(200);
      expect(sent).toEqual([]);
      // Only Tiếp tục: a member may not pause a session without a Host.
      expect(
        (await chi!.patch(byId(room.id)).send({ action: 'pause' })).body.code,
      ).toBe(ErrorCode.Forbidden);
    });

    it('AC12 (âm): a Host and paused, a member resumes → 40302', async () => {
      const room = await running(2);
      const [an, binh] = room.people;
      await an!.patch(byId(room.id)).send({ action: 'pause' }).expect(200);
      expect(
        (await binh!.patch(byId(room.id)).send({ action: 'resume' })).body.code,
      ).toBe(ErrorCode.Forbidden);
    });
  });

  describe('Ending (REQ-STUDY-01, STUDY-11 AC7)', () => {
    it('STUDY-01 AC10: Stop → 204; END to each with their own seconds, streak first; stop again 204, other actions 40901', async () => {
      const room = await running(2);
      const [an, binh] = room.people;
      clock.advance(10 * MIN);
      await an!.patch(byId(room.id)).send({ action: 'stop' }).expect(204);
      const ends = userCopies<FocusSessionEnd>('FOCUS_SESSION_END');
      expect(ends.get(binh!.userId)).toMatchObject({
        end_reason: 'stopped',
        ended_by: an!.id,
        focused_seconds: 10 * MIN,
      });
      const firstEnd = sent.findIndex((s) => s.t === 'FOCUS_SESSION_END');
      const lastStreak = sent.map((s) => s.t).lastIndexOf('STREAK_UPDATE');
      expect(lastStreak).toBeGreaterThan(-1);
      expect(lastStreak).toBeLessThan(firstEnd);
      expect(
        (
          sent.find((s) => s.to === 'channel' && s.t === 'FOCUS_SESSION_END')!
            .d as FocusSessionEnd
        ).focused_seconds,
      ).toBeNull();
      const parts = await partsOf(room.sessionId);
      expect(parts.every((p) => p.leftAt !== null)).toBe(true);

      await an!.patch(byId(room.id)).send({ action: 'stop' }).expect(204);
      expect(
        (await an!.patch(byId(room.id)).send({ action: 'pause' })).body.code,
      ).toBe(ErrorCode.Conflict);
    });

    it('AC7: Phòng học turned off → focus_disabled by who did it, once, even with a Stop at the same moment', async () => {
      const room = await running(3);
      const [an] = room.people;
      clock.advance(8 * MIN);
      await Promise.all([
        an!
          .patch(ChannelRoutes.byId.replace(':id', room.voice.id))
          .send({ focus_control: 'off' })
          .expect(200),
        an!.patch(byId(room.id)).send({ action: 'stop' }).expect(204),
      ]);
      const ends = sent.filter(
        (s) => s.to === 'channel' && s.t === 'FOCUS_SESSION_END',
      );
      expect(ends).toHaveLength(1);
      const parts = await partsOf(room.sessionId);
      expect(parts.map((p) => p.focusedSeconds)).toEqual([
        8 * MIN,
        8 * MIN,
        8 * MIN,
      ]);
    });

    it('a deleted channel ends its session (channel_deleted)', async () => {
      const room = await running(2);
      const [an, binh] = room.people;
      await an!
        .del(ChannelRoutes.byId.replace(':id', room.voice.id))
        .expect(204);
      expect(
        userCopies<FocusSessionEnd>('FOCUS_SESSION_END').get(binh!.userId),
      ).toMatchObject({ end_reason: 'channel_deleted', ended_by: an!.id });
    });

    it('AC7: everyone gone 5 minutes → empty_channel; someone back within 5 minutes cancels it', async () => {
      const room = await running(2);
      const [an, binh] = room.people;
      await leave(an!);
      const empties = () => jobs.filter((j) => j.startsWith('empty'));
      expect(empties()).toEqual([]); // Bình still there
      await leave(binh!);
      const since = clock.now();
      expect(empties()).toEqual([`empty ${room.id} ${since.toISOString()}`]);

      clock.advance(2 * MIN);
      await sit(binh!, room);
      clock.advance(3 * MIN);
      await rooms.emptyCheck(room.sessionId, since);
      const [still] = await db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.id, room.sessionId));
      expect(still!.endedAt).toBeNull();

      await leave(binh!);
      const again = clock.now();
      clock.advance(5 * MIN);
      await rooms.emptyCheck(room.sessionId, again);
      const [ended] = await db
        .select()
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.id, room.sessionId),
            eq(focusSessions.endReason, 'empty_channel'),
          ),
        );
      expect(ended!.endedBy).toBeNull();
    });
  });

  describe('Participation (REQ-STUDY-15, P3-B3.3)', () => {
    it('4.9.2: An 35 minutes, Bình 48; An leaves → Bình Host; empty 5 minutes → ended', async () => {
      const room = await studyRoom(2);
      const [an, binh] = room.people;
      await sit(an!, room); // 19:55
      clock.advance(5 * MIN); // 20:00 An starts
      const res = await an!.post(start(room.voice.id)).send(P25).expect(201);
      const id = BigInt((res.body as FocusSessionResponse).focus_session.id);
      clock.advance(12 * MIN); // 20:12 Bình
      await sit(binh!, room);
      clock.advance(13 * MIN); // 20:25 break
      await rooms.tick(id);
      clock.advance(5 * MIN); // 20:30 focus
      await rooms.tick(id);
      clock.advance(10 * MIN); // 20:40 An leaves
      sent.length = 0;
      await leave(an!);
      expect(await seconds(id, an!)).toBe(35 * MIN);
      expect(await hostOf(id)).toBe(binh!.userId);
      const update = userCopies<FocusSessionResponse>('FOCUS_SESSION_UPDATE');
      expect(update.get(binh!.userId)!.focus_session.host_id).toBe(binh!.id);
      // the leaver keeps their seconds in `me`, counting stopped
      expect(update.get(an!.userId)!.focus_session.me).toEqual({
        focused_seconds: 35 * MIN,
        counting_since: null,
      });
      clock.advance(15 * MIN); // 20:55 break
      await rooms.tick(id);
      clock.advance(5 * MIN); // 21:00 focus
      await rooms.tick(id);
      clock.advance(10 * MIN); // 21:10 Bình leaves, the room empties
      await leave(binh!);
      expect(await seconds(id, binh!)).toBe(48 * MIN);
      const emptied = clock.now();
      clock.advance(5 * MIN); // 21:15
      await rooms.emptyCheck(id, emptied);
      const [row] = await db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.id, id));
      expect(row).toMatchObject({ endReason: 'empty_channel' });
      // History by local day (STUDY-17): Bình's three stretches on one day.
      const [binhPart] = (await partsOf(id)).filter(
        (p) => p.userId === binh!.userId,
      );
      expect(Object.values(binhPart!.creditedDays)).toEqual([48 * MIN]);
    });

    it('AC7: in the room before the start → counted from the start', async () => {
      const room = await studyRoom(1);
      const [an] = room.people;
      await sit(an!, room);
      clock.advance(5 * MIN);
      const startedAt = clock.now();
      await an!.post(start(room.voice.id)).send(P25).expect(201);
      const [part] = await db
        .select()
        .from(focusSessionParticipations)
        .where(eq(focusSessionParticipations.userId, an!.userId));
      expect(part!.joinedAt).toEqual(startedAt);
    });

    it('AC5: leaving at 12:40 of focus → 760 s; AC6: five stays of 2:59 → 895 s', async () => {
      const room = await running(2);
      const [, binh] = room.people;
      clock.advance(12 * MIN + 40);
      await leave(binh!);
      expect(await seconds(room.sessionId, binh!)).toBe(760);

      const other = await running(2);
      const [, chi] = other.people;
      await leave(chi!);
      for (let i = 0; i < 5; i++) {
        await sit(chi!, other);
        clock.advance(2 * MIN + 59);
        await leave(chi!);
      }
      expect(await seconds(other.sessionId, chi!)).toBe(5 * 179);
    });

    it('AC2: network off 10 minutes in focus → counted to the last heartbeat only', async () => {
      const room = await running(2);
      const [, binh] = room.people;
      clock.advance(5 * MIN);
      await rooms.heartbeat(binh!.userId, room.sessionId); // the last one
      await goAway(binh!);
      clock.advance(3 * MIN + 1);
      await app.get(VoiceRoomsService).expireAway();
      expect(await seconds(room.sessionId, binh!)).toBe(5 * MIN);
    });

    it('AC8: closed 2 minutes then back → one Participation, the whole focus counted', async () => {
      const room = await running(2);
      const [, binh] = room.people;
      clock.advance(10 * MIN);
      await rooms.heartbeat(binh!.userId, room.sessionId);
      await goAway(binh!);
      clock.advance(2 * MIN);
      await comeBack(binh!);
      await rooms.heartbeat(binh!.userId, room.sessionId);
      clock.advance(13 * MIN);
      await rooms.tick(room.sessionId);
      const mine = (await partsOf(room.sessionId)).filter(
        (p) => p.userId === binh!.userId,
      );
      expect(mine).toHaveLength(1);
      expect(mine[0]!.focusedSeconds).toBe(25 * MIN);
    });

    it('AC1: two 25/5 cycles with heartbeats → 50 minutes', async () => {
      const room = await running(2);
      const [, binh] = room.people;
      for (const m of [25, 5, 25, 5]) {
        for (let i = 0; i < m; i++) {
          clock.advance(MIN);
          await rooms.heartbeat(binh!.userId, room.sessionId);
        }
        await rooms.tick(room.sessionId);
      }
      expect(await seconds(room.sessionId, binh!)).toBe(50 * MIN);
    });

    it('STUDY-01 AC10: Bình (Host) stops; An gets her own 31 minutes, re-joins added up', async () => {
      const room = await studyRoom(2);
      const [binh, an] = room.people;
      await sit(binh!, room);
      await sit(an!, room);
      const res = await binh!.post(start(room.voice.id)).send(P25).expect(201);
      const id = BigInt((res.body as FocusSessionResponse).focus_session.id);
      clock.advance(20 * MIN);
      await leave(an!);
      await sit(an!, room);
      clock.advance(5 * MIN); // round 1 done: 25
      await rooms.tick(id);
      clock.advance(5 * MIN);
      await rooms.tick(id);
      clock.advance(6 * MIN);
      sent.length = 0;
      await rooms.act(binh!.userId, id, { action: 'stop' });
      const ends = userCopies<FocusSessionEnd>('FOCUS_SESSION_END');
      expect(ends.get(an!.userId)!.focused_seconds).toBe(31 * MIN);
      expect(ends.get(binh!.userId)).toMatchObject({
        ended_by: binh!.id,
        focused_seconds: 31 * MIN,
      });
    });

    it('a Room Session Participant cannot start Solo (STUDY-10 AC2 → 40903)', async () => {
      const room = await running(2);
      const res = await room.people[1]!.post(SoloRoutes.start).send(P25);
      expect(res.body.code).toBe(ErrorCode.FocusSessionAlreadyActive);
    });

    it('STUDY-10 AC7: joining a running session ends my Solo (joined_room)', async () => {
      const room = await running(1);
      const late = await signedIn('Bình');
      await db
        .insert(serverMembers)
        .values({ serverId: BigInt(room.server.id), userId: late.userId });
      await late.post(SoloRoutes.start).send(P25).expect(201);
      clock.advance(7 * MIN);
      await sit(late, room);
      const [solo] = await db
        .select()
        .from(soloSessions)
        .where(eq(soloSessions.userId, late.userId));
      expect(solo).toMatchObject({
        endReason: 'joined_room',
        focusedSeconds: 7 * MIN,
      });
      expect((await partsOf(room.sessionId)).map((p) => p.userId)).toContain(
        late.userId,
      );
    });
  });

  describe('Host (REQ-STUDY-11)', () => {
    it('AC2: the Host leaves → the longest Participant takes over; kicked → at once', async () => {
      const room = await running(3);
      const [an, binh, chi] = room.people;
      await leave(an!, 'kicked');
      expect(await hostOf(room.sessionId)).toBe(binh!.userId);
      await leave(binh!);
      expect(await hostOf(room.sessionId)).toBe(chi!.userId);
    });

    it('AC5: managers, the moderator Host leaves → no Host; a moderator joins → Host', async () => {
      const room = await studyRoom(3, 'managers');
      const [an, binh, chi] = room.people;
      await giveRole(room.server.id, P.MANAGE_STUDY_ROOMS, binh!);
      await sit(binh!, room);
      await sit(chi!, room);
      const res = await binh!.post(start(room.voice.id)).send(P25).expect(201);
      const id = BigInt((res.body as FocusSessionResponse).focus_session.id);
      await leave(binh!);
      expect(await hostOf(id)).toBeNull();
      await sit(an!, room); // the Owner holds every permission
      expect(await hostOf(id)).toBe(an!.userId);
    });

    it('AC10: the Host away 2 minutes stays Host; past 3 minutes the next one takes over', async () => {
      const room = await running(2);
      const [an, binh] = room.people;
      await goAway(an!);
      clock.advance(2 * MIN);
      await app.get(VoiceRoomsService).expireAway();
      expect(await hostOf(room.sessionId)).toBe(an!.userId);
      clock.advance(MIN + 1);
      await app.get(VoiceRoomsService).expireAway();
      expect(await hostOf(room.sessionId)).toBe(binh!.userId);
    });
  });

  describe('StudyRoomQuery (for Hiếu)', () => {
    it('room, Host, seconds in the session and who comes next', async () => {
      const room = await running(2);
      const [an, binh] = room.people;
      clock.advance(7 * MIN);
      const q = app.get(StudyRoomQuery);
      expect(await q.getRoomOf(an!.userId)).toEqual({
        channelId: room.channelId,
        serverId: BigInt(room.server.id),
        sessionId: room.sessionId,
        isHost: true,
        focusedSecondsInSession: 7 * MIN,
        successorName: 'Bình',
      });
      expect(await q.getRoomOf(binh!.userId)).toMatchObject({
        isHost: false,
        successorName: null,
      });
      await leave(binh!);
      expect(await q.getRoomOf(binh!.userId)).toBeNull();
      expect((await q.getRoomOf(an!.userId))!.successorName).toBeNull();
    });
  });

  describe('Review gaps (#146 / #147)', () => {
    it('STUDY-11 AC7: Phòng học off → END focus_disabled by who did it, each with their own seconds', async () => {
      const room = await running(3);
      const [an] = room.people;
      clock.advance(8 * MIN);
      await an!
        .patch(ChannelRoutes.byId.replace(':id', room.voice.id))
        .send({ focus_control: 'off' })
        .expect(200);
      const ends = userCopies<FocusSessionEnd>('FOCUS_SESSION_END');
      expect(ends.size).toBe(3);
      for (const p of room.people)
        expect(ends.get(p.userId)).toMatchObject({
          end_reason: 'focus_disabled',
          ended_by: an!.id,
          focused_seconds: 8 * MIN,
        });
    });

    it('STUDY-11 AC2: the longest stay who may start takes over, not just the longest', async () => {
      const room = await studyRoom(4, 'managers');
      const [, binh, chi, dung] = room.people;
      await giveRole(room.server.id, P.MANAGE_STUDY_ROOMS, chi!);
      await giveRole(room.server.id, P.MANAGE_STUDY_ROOMS, dung!);
      await sit(binh!, room); // longest, but a plain member
      clock.advance(MIN);
      await sit(dung!, room);
      clock.advance(MIN);
      await sit(chi!, room);
      const res = await chi!.post(start(room.voice.id)).send(P25).expect(201);
      const id = BigInt((res.body as FocusSessionResponse).focus_session.id);
      await leave(chi!, 'logout'); // signing out leaves at once too
      expect(await hostOf(id)).toBe(dung!.userId);
    });

    it('STUDY-15 (4): a stay across local midnight is split by day', async () => {
      // Move to 23:50 in Hồ Chí Minh City (UTC+7), the users' default time zone.
      const day = 24 * 60 * MIN * 1000;
      const local = (clock.now().getTime() + 7 * 60 * MIN * 1000) % day;
      clock.advance(
        (((((23 * 60 + 50) * MIN * 1000 - local) % day) + day) % day) / 1000,
      );
      const room = await running(2);
      const [, binh] = room.people;
      const beforeMidnight =
        (day - ((clock.now().getTime() + 7 * 60 * MIN * 1000) % day)) / 1000;
      clock.advance(20 * MIN);
      await leave(binh!);
      const [part] = (await partsOf(room.sessionId)).filter(
        (p) => p.userId === binh!.userId,
      );
      expect(Object.values(part!.creditedDays)).toEqual([
        beforeMidnight,
        20 * MIN - beforeMidnight,
      ]);
    });
  });

  it('READY.focus_sessions: the running session of a room I can view, with my `me`', async () => {
    const room = await running(2);
    const [, binh] = room.people;
    const ready = await rooms.ready(binh!.userId);
    const mine = ready.find((s) => s.id === room.id);
    expect(mine).toMatchObject({
      channel_id: room.voice.id,
      me: { focused_seconds: 0 },
    });
  });
});
