import type { INestApplication } from '@nestjs/common';
import {
  ErrorCode,
  SoloRoutes,
  type SoloSessionResponse,
} from '@nezfocus/shared';
import { and, eq } from 'drizzle-orm';
import { Clock, fixedClock } from '../src/common/clock.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import { SoloSessionService } from '../src/modules/study/solo-session.service.js';
import { dailyStudyStats } from '../src/modules/study/study.schema.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

// REQ-STUDY-10 through REST, Postgres and the stats core; the phase rules are unit-tested in solo-machine. Needs `pnpm dev:infra`.
describe('Solo Session (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  const clock = fixedClock(new Date('2026-11-06T13:00:00Z')); // 20:00 in Ho Chi Minh City
  const events: { userId: bigint; t: string; d: SoloSessionResponse }[] = [];

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b
        .overrideProvider(Clock)
        .useValue(clock)
        .overrideProvider(EventPublisher)
        .useValue({
          toUser: async (userId: bigint, t: string, d: SoloSessionResponse) => {
            events.push({ userId, t, d });
          },
        }),
    ));
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const P25 = { cycle_config: { focus_min: 25, short_break_min: 5 } };

  const signedIn = async () => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const api = http(app);
    const bearer = { type: 'bearer' as const };
    let token = session.access_token;
    let refreshToken = session.refresh_token;
    await api
      .post('/auth/complete-account')
      .auth(token, bearer)
      .send(completion(uniqueUsername()))
      .expect(200);
    return {
      userId: BigInt(session.user.id),
      // The fake clock also ages the access token, so renew it after a long jump.
      renew: async () => {
        const res = await api
          .post('/auth/refresh')
          .send({ refresh_token: refreshToken })
          .expect(200);
        ({ access_token: token, refresh_token: refreshToken } = res.body);
      },
      start: (body: object = P25) =>
        api.post(SoloRoutes.start).auth(token, bearer).send(body),
      current: () => api.get(SoloRoutes.current).auth(token, bearer),
      get: (id: string) => api.get(SoloRoutes.byId(id)).auth(token, bearer),
      act: (id: string, body: object) =>
        api.patch(SoloRoutes.byId(id)).auth(token, bearer).send(body),
    };
  };

  const statsOf = async (userId: bigint, localDate: string) => {
    const [row] = await db
      .select()
      .from(dailyStudyStats)
      .where(
        and(
          eq(dailyStudyStats.userId, userId),
          eq(dailyStudyStats.localDate, localDate),
        ),
      );
    return row;
  };

  it('AC6: stop at minute 12 writes 12 minutes to the day, as Solo', async () => {
    const u = await signedIn();
    const started = await u.start().expect(201);
    const id = started.body.solo_session.id as string;
    expect(started.body).toMatchObject({
      solo_session: {
        status: 'running',
        phase: 'focus',
        phase_ends_at: new Date(
          clock.now().getTime() + 25 * 60_000,
        ).toISOString(),
      },
      backend_time: clock.now().toISOString(),
    });

    clock.advance(12 * 60);
    const stopped = await u.act(id, { action: 'stop' }).expect(200);
    expect(stopped.body.solo_session).toMatchObject({
      status: 'ended',
      end_reason: 'stopped',
      focused_seconds: 720,
      hit_daily_cap: false,
    });
    const [day] = stopped.body.solo_session.days;
    expect(await statsOf(u.userId, day.local_date)).toMatchObject({
      focusedSeconds: 720,
      soloSeconds: 720,
    });
  });

  it('one Solo Session at a time: a second start is 40903', async () => {
    const u = await signedIn();
    await u.start().expect(201);
    const second = await u.start().expect(409);
    expect(second.body.code).toBe(ErrorCode.FocusSessionAlreadyActive);
  });

  it('AC1 + AC3: the phase-end job credits 25 minutes; GET current restores the phase for the app', async () => {
    const u = await signedIn();
    const id = (await u.start().expect(201)).body.solo_session.id as string;

    clock.advance(25 * 60);
    await app.get(SoloSessionService).tick(BigInt(id));
    clock.advance(2 * 60);
    await u.renew();
    const current = await u.current().expect(200);
    expect(current.body).toMatchObject({
      solo_session: {
        id,
        status: 'running',
        phase: 'short_break',
        focused_seconds: 1500,
        phase_ends_at: new Date(
          clock.now().getTime() + 3 * 60_000,
        ).toISOString(),
      },
      backend_time: clock.now().toISOString(),
    });
    const [day] = current.body.solo_session.days;
    expect(await statsOf(u.userId, day.local_date)).toMatchObject({
      focusedSeconds: 1500,
    });
  });

  it('AC5: a wait that runs out ends the session at the end of the break; current is then empty', async () => {
    const u = await signedIn();
    const id = (await u.start().expect(201)).body.solo_session.id as string;
    const breakEnds = clock.now().getTime() + 30 * 60_000;

    clock.advance(41 * 60);
    await u.renew();
    expect((await u.current().expect(200)).body.solo_session).toBeNull();
    expect((await u.get(id).expect(200)).body.solo_session).toMatchObject({
      status: 'ended',
      end_reason: 'wait_timeout',
      ended_at: new Date(breakEnds).toISOString(),
      focused_seconds: 1500,
    });
    await u.start().expect(201);
  });

  it("every change reaches the user's devices as SOLO_SESSION_UPDATE", async () => {
    const u = await signedIn();
    const id = (await u.start().expect(201)).body.solo_session.id as string;
    await u.act(id, { action: 'pause' }).expect(200);
    await u.act(id, { action: 'pause' }).expect(200); // replay: no new event
    await u
      .act(id, {
        action: 'config',
        cycle_config: { focus_min: 50, short_break_min: 10 },
      })
      .expect(200);
    const mine = events.filter((e) => e.userId === u.userId);
    expect(mine.map((e) => [e.t, e.d.solo_session.status])).toEqual([
      ['SOLO_SESSION_UPDATE', 'running'],
      ['SOLO_SESSION_UPDATE', 'paused'],
      ['SOLO_SESSION_UPDATE', 'paused'],
    ]);
    expect(mine[2].d.solo_session.next_cycle_config).toEqual({
      focus_min: 50,
      short_break_min: 10,
    });
  });

  it("rejects a bad cycle config (40001), someone else's session (40401) and a wrong-state action (40901)", async () => {
    const u = await signedIn();
    const other = await signedIn();
    const bad = await u
      .start({ cycle_config: { focus_min: 200, short_break_min: 5 } })
      .expect(400);
    expect(bad.body.code).toBe(ErrorCode.ValidationError);
    const id = (await u.start().expect(201)).body.solo_session.id as string;
    expect((await other.get(id).expect(404)).body.code).toBe(
      ErrorCode.NotFound,
    );
    await u.act(id, { action: 'pause' }).expect(200);
    expect(
      (await u.act(id, { action: 'continue' }).expect(409)).body.code,
    ).toBe(ErrorCode.Conflict);
  });
});
