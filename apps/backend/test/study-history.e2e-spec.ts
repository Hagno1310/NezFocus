import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  Permission,
  ServerRoutes,
  StudyStatsRoutes,
  type ServerResponse,
  type StudySessionsResponse,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { Clock, fixedClock } from '../src/common/clock.js';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import {
  focusSessionParticipations,
  focusSessions,
} from '../src/modules/study/focus.schema.js';
import { soloSessions } from '../src/modules/study/solo.schema.js';
import { dailyStudyStats } from '../src/modules/study/study.schema.js';
import {
  channelPermissionOverwrites,
  channels,
  OverwriteTargetCode,
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

// REQ-STUDY-17 (and the streak part of REQ-STUDY-03) through REST and Postgres. Needs `pnpm dev:infra`.
describe('Study stats and history (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  // Wednesday 14/10/2026, 12:00 in Ho Chi Minh City.
  const clock = fixedClock(new Date('2026-10-14T05:00:00Z'));

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(Clock).useValue(clock),
    ));
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const signedIn = async () => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const token = session.access_token;
    const auth = { type: 'bearer' as const };
    await http(app)
      .post('/auth/complete-account')
      .auth(token, auth)
      .send(completion(uniqueUsername()))
      .expect(200);
    const api = http(app);
    return {
      userId: BigInt(session.user.id),
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const days = (userId: bigint, minutesByDate: Record<string, number>) =>
    db.insert(dailyStudyStats).values(
      Object.entries(minutesByDate).map(([localDate, m]) => ({
        userId,
        localDate,
        timezone: 'Asia/Ho_Chi_Minh',
        focusedSeconds: m * 60,
        soloSeconds: Math.floor(m / 2) * 60,
      })),
    );

  const stats = async (me: Me, query: string) =>
    (await me.get(`${StudyStatsRoutes.stats}?${query}`).expect(200))
      .body as StudyStatsResponse;
  const sessions = async (me: Me, query: string) =>
    (await me.get(`${StudyStatsRoutes.sessions}?${query}`).expect(200))
      .body as StudySessionsResponse;

  const solo = (
    userId: bigint,
    startIso: string,
    endIso: string | null,
    creditedDays: Record<string, number>,
  ) => {
    const id = app.get(SnowflakeGenerator).next();
    const focusedSeconds = Object.values(creditedDays).reduce(
      (a, b) => a + b,
      0,
    );
    return db
      .insert(soloSessions)
      .values({
        id,
        userId,
        focusMin: 50,
        shortBreakMin: 10,
        status: endIso ? 'ended' : 'running',
        startedAt: new Date(startIso),
        endedAt: endIso ? new Date(endIso) : null,
        endReason: endIso ? 'stopped' : null,
        focusedSeconds,
        creditedDays,
      })
      .then(() => String(id));
  };

  // A server of `owner` with `me` as a member; its voice channel is the Study Room.
  const roomOf = async (owner: Me, me: Me, name: string) => {
    const server = (
      await owner
        .post(ServerRoutes.create)
        .send({ name, template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db
      .insert(serverMembers)
      .values({ serverId: BigInt(server.id), userId: me.userId });
    const room = server.channels.find((c) => c.type === 'voice')!;
    return { serverId: BigInt(server.id), channelId: BigInt(room.id), room };
  };

  const roomSession = async (
    me: Me,
    r: { serverId: bigint; channelId: bigint },
    joins: [string, string, number][],
  ) => {
    const ids = app.get(SnowflakeGenerator);
    const id = ids.next();
    await db.insert(focusSessions).values({
      id,
      channelId: r.channelId,
      serverId: r.serverId,
      startedAt: new Date(joins[0]![0]),
      endedAt: new Date(joins[joins.length - 1]![1]),
    });
    await db.insert(focusSessionParticipations).values(
      joins.map(([from, to, m]) => ({
        id: ids.next(),
        focusSessionId: id,
        userId: me.userId,
        joinedAt: new Date(from),
        lastHeartbeatAt: new Date(to),
        leftAt: new Date(to),
        focusedSeconds: m * 60,
      })),
    );
    return String(id);
  };

  it('AC1 + AC2: the week so far, the same first days of last week, per-day minutes', async () => {
    const an = await signedIn();
    await days(an.userId, {
      '2026-10-05': 30, // Mon last week
      '2026-10-06': 50,
      '2026-10-08': 100, // Thu last week: after "today", not compared
      '2026-10-12': 40,
      '2026-10-13': 40,
      '2026-10-14': 40,
    });
    const s = await stats(an, 'view=week');
    expect(s).toMatchObject({
      view: 'week',
      timezone: 'Asia/Ho_Chi_Minh',
      today: '2026-10-14',
      from: '2026-10-12',
      to: '2026-10-18',
      total_minutes: 120,
      solo_minutes: 60,
      room_minutes: 60,
      previous_minutes: 80,
      all_time_minutes: 300,
      first_date: '2026-10-05',
      current_streak_days: 0, // set by credits only; these rows were written straight in
      today_minutes: 40,
    });
    expect(s.days.map((d) => d.focused_minutes)).toEqual([
      40, 40, 40, 0, 0, 0, 0,
    ]);
    expect(s.days.reduce((n, d) => n + d.focused_minutes, 0)).toBe(
      s.total_minutes,
    );

    // A past week compares with all of the week before it.
    const last = await stats(an, 'view=week&date=2026-10-07');
    expect(last).toMatchObject({
      from: '2026-10-05',
      total_minutes: 180,
      previous_minutes: 0,
    });

    const month = await stats(an, 'view=month&date=2026-10-14');
    expect(month).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
      total_minutes: 300,
    });
    expect(month.days).toHaveLength(31);
  });

  it('never studied: first_date is null and every number 0', async () => {
    const an = await signedIn();
    expect(await stats(an, 'view=month')).toMatchObject({
      first_date: null,
      total_minutes: 0,
      all_time_minutes: 0,
      current_streak_days: 0,
      longest_streak_days: 0,
      today_minutes: 0,
    });
  });

  it('AC6 (negative): view=year, limit=100 or a forged cursor → 40001', async () => {
    const an = await signedIn();
    for (const path of [
      `${StudyStatsRoutes.stats}?view=year&date=2026-10-14`,
      `${StudyStatsRoutes.stats}?view=week&date=14-10-2026`,
      `${StudyStatsRoutes.sessions}?limit=100`,
      `${StudyStatsRoutes.sessions}?before=abc`,
    ]) {
      const res = await an.get(path).expect(400);
      expect(res.body.code).toBe(ErrorCode.ValidationError);
    }
  });

  it('running first, then newest; 0 seconds have no row; 20 per page by cursor', async () => {
    const an = await signedIn();
    const a = await solo(
      an.userId,
      '2026-10-12T10:00:00Z',
      '2026-10-12T10:20:00Z',
      { '2026-10-12': 1200 },
    );
    const b = await solo(
      an.userId,
      '2026-10-13T10:00:00Z',
      '2026-10-13T10:00:30Z',
      { '2026-10-13': 30 },
    );
    await solo(an.userId, '2026-10-13T11:00:00Z', '2026-10-13T11:00:20Z', {}); // 0 s
    const c = await solo(
      an.userId,
      '2026-10-13T12:00:00Z',
      '2026-10-13T12:10:00Z',
      { '2026-10-13': 600 },
    );
    const running = await solo(an.userId, '2026-10-14T04:30:00Z', null, {});

    const first = await sessions(an, 'limit=2');
    expect(first.study_sessions.map((r) => r.id)).toEqual([running, c]);
    expect(first.study_sessions[0]).toMatchObject({
      kind: 'solo',
      room: null,
      ended_at: null,
      join_count: 1,
    });
    const second = await sessions(an, `limit=2&before=${first.next_cursor}`);
    expect(second.study_sessions.map((r) => r.id)).toEqual([b, a]);
    expect(second.study_sessions[0]!.focused_seconds).toBe(30); // app: "dưới 1 phút"
    expect(second.next_cursor).toBeNull();

    expect((await sessions(an, '')).study_sessions).toHaveLength(4);
  });

  it('AC4: Solo 23:30 Sun – 00:40 Mon is one row in the week of Sunday, with seconds per day', async () => {
    const an = await signedIn();
    const id = await solo(
      an.userId,
      '2026-10-18T16:30:00Z',
      '2026-10-18T17:40:00Z',
      {
        '2026-10-18': 1800,
        '2026-10-19': 2400,
      },
    );
    const week = await sessions(an, 'from=2026-10-12&to=2026-10-18');
    expect(week.study_sessions).toEqual([
      expect.objectContaining({
        id,
        started_at: '2026-10-18T16:30:00.000Z',
        ended_at: '2026-10-18T17:40:00.000Z',
        focused_seconds: 4200,
        days: [
          { local_date: '2026-10-18', focused_seconds: 1800 },
          { local_date: '2026-10-19', focused_seconds: 2400 },
        ],
      }),
    ]);
    expect(
      (await sessions(an, 'from=2026-10-19&to=2026-10-25')).study_sessions,
    ).toEqual([]);
  });

  it('AC3 + AC5: re-joins make one row; room names follow access today', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const visible = await roomOf(binh, an, 'Ôn thi Giải tích 2');
    const deleted = await roomOf(binh, an, 'Nhóm đồ án Mobile');
    const hidden = await roomOf(binh, an, 'CLB Guitar PTIT');
    const gone = await roomOf(binh, an, 'Toán rời rạc');

    const ac3 = await roomSession(an, visible, [
      ['2026-10-10T12:00:00Z', '2026-10-10T12:20:00Z', 20],
      ['2026-10-10T12:30:00Z', '2026-10-10T12:45:00Z', 11],
    ]);
    const del = await roomSession(an, deleted, [
      ['2026-10-08T13:10:00Z', '2026-10-08T13:25:00Z', 15],
    ]);
    const hid = await roomSession(an, hidden, [
      ['2026-10-07T14:00:00Z', '2026-10-07T14:25:00Z', 25],
    ]);
    const gon = await roomSession(an, gone, [
      ['2026-10-06T14:00:00Z', '2026-10-06T14:25:00Z', 25],
    ]);
    await db
      .update(channels)
      .set({ deletedAt: clock.now() })
      .where(eq(channels.id, deleted.channelId));
    await db.insert(channelPermissionOverwrites).values({
      channelId: BigInt(hidden.room.parent_id!), // the room syncs with its category
      targetId: hidden.serverId, // @everyone
      targetType: OverwriteTargetCode.role,
      deny: Permission.VIEW_CHANNEL,
    });
    await db
      .delete(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, gone.serverId),
          eq(serverMembers.userId, an.userId),
        ),
      );

    const rows = (await sessions(an, 'from=2026-10-05&to=2026-10-11'))
      .study_sessions;
    expect(rows.map((r) => r.id)).toEqual([ac3, del, hid, gon]);
    expect(rows[0]).toMatchObject({
      kind: 'room',
      room: {
        access: 'visible',
        channel_name: visible.room.name,
        server_name: 'Ôn thi Giải tích 2',
      },
      started_at: '2026-10-10T12:00:00.000Z',
      ended_at: '2026-10-10T12:45:00.000Z',
      join_count: 2,
      focused_seconds: 31 * 60,
    });
    expect(rows.slice(1).map((r) => r.room)).toEqual([
      {
        access: 'deleted',
        channel_name: null,
        server_name: 'Nhóm đồ án Mobile',
      },
      { access: 'hidden', channel_name: null, server_name: 'CLB Guitar PTIT' },
      { access: 'gone', channel_name: null, server_name: null },
    ]);
  });
});
