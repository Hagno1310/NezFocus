import type { INestApplication } from '@nestjs/common';
import type { StreakState } from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { Clock, fixedClock } from '../src/common/clock.js';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import { StreakService } from '../src/modules/study/streak.service.js';
import { StudyStatsRepository } from '../src/modules/study/study-stats.repository.js';
import { UsersRepository } from '../src/modules/users/users.repository.js';
import { userSettings } from '../src/modules/users/users.schema.js';
import { createTestApp, uniqueEmail } from './helpers.js';

// REQ-STUDY-03 against the real schema, with a fake clock. Needs `pnpm dev:infra`.
describe('Study Streak (e2e)', () => {
  let app: INestApplication;
  let stats: StudyStatsRepository;
  let streaks: StreakService;
  const clock = fixedClock();
  const events: { userId: bigint; t: string; d: StreakState }[] = [];

  beforeAll(async () => {
    ({ app } = await createTestApp((b) =>
      b
        .overrideProvider(Clock)
        .useValue(clock)
        .overrideProvider(EventPublisher)
        .useValue({
          toUser: async (userId: bigint, t: string, d: StreakState) => {
            events.push({ userId, t, d });
          },
        }),
    ));
    stats = app.get(StudyStatsRepository);
    streaks = app.get(StreakService);
  });

  afterAll(async () => {
    await app.close();
  });

  const newUser = async (timezone = 'Asia/Ho_Chi_Minh') => {
    const id = app.get(SnowflakeGenerator).next();
    await app
      .get(UsersRepository)
      .createVerified({ id, email: uniqueEmail(), now: new Date() });
    await app
      .get<Db>(DB)
      .update(userSettings)
      .set({ timezone })
      .where(eq(userSettings.userId, id));
    return id;
  };

  const focus = (userId: bigint, startIso: string, m: number) => {
    const start = new Date(startIso);
    return stats.credit({
      userId,
      source: 'solo',
      intervals: [{ start, end: new Date(start.getTime() + m * 60_000) }],
    });
  };

  const at = (iso: string) => {
    const now = clock.now().getTime();
    clock.advance((Date.parse(iso) - now) / 1000);
  };

  const streak = async (userId: bigint) => (await streaks.state(userId)).streak;

  it('AC1: yesterday 20 min, today 10 + 8 min → streak 2 after the second session', async () => {
    const u = await newUser();
    await focus(u, '2026-10-17T13:00:00Z', 20); // Sat 20:00 GMT+7
    at('2026-10-18T14:00:00Z');
    await focus(u, '2026-10-18T03:00:00Z', 10);
    expect(await streak(u)).toEqual({
      current_streak_days: 1,
      longest_streak_days: 1,
      today_minutes: 10,
    });
    await focus(u, '2026-10-18T05:00:00Z', 8);
    expect(await streak(u)).toEqual({
      current_streak_days: 2,
      longest_streak_days: 2,
      today_minutes: 18,
    });
  });

  it('AC2: yesterday only 10 min → 0 today until 15 min, with no midnight job', async () => {
    const u = await newUser();
    await focus(u, '2026-10-15T13:00:00Z', 30); // Thu
    await focus(u, '2026-10-16T13:00:00Z', 30); // Fri
    await focus(u, '2026-10-17T13:00:00Z', 10); // Sat, not qualified
    at('2026-10-18T02:00:00Z'); // Sun 09:00
    expect(await streak(u)).toEqual({
      current_streak_days: 0,
      longest_streak_days: 2,
      today_minutes: 0,
    });
    await focus(u, '2026-10-18T02:00:00Z', 15);
    expect((await streak(u)).current_streak_days).toBe(1);
    expect((await streak(u)).longest_streak_days).toBe(2);
  });

  it('AC3: a session across local 00:00 counts for both days', async () => {
    const u = await newUser();
    at('2026-10-19T00:00:00Z'); // Mon 07:00
    await focus(u, '2026-10-18T16:30:00Z', 70); // Sun 23:30 → Mon 00:40
    expect(await streak(u)).toEqual({
      current_streak_days: 2,
      longest_streak_days: 2,
      today_minutes: 40,
    });
  });

  it('follows user_settings.timezone, not GMT+7', async () => {
    const u = await newUser('America/New_York'); // UTC−4 in October
    // 23:50 Sat → 00:20 Sun New York time: 10 min Saturday, 20 min Sunday.
    await focus(u, '2026-10-18T03:50:00Z', 30);
    at('2026-10-18T16:00:00Z'); // Sun 12:00 New York
    expect(await streak(u)).toEqual({
      current_streak_days: 1, // Sunday alone: Saturday's 10 min do not qualify
      longest_streak_days: 1,
      today_minutes: 20,
    });
  });

  it('announce sends STREAK_UPDATE to the user (also after a time zone change, P1-A5.1 #76)', async () => {
    const u = await newUser();
    at('2026-10-18T14:00:00Z');
    await focus(u, '2026-10-18T03:00:00Z', 16);
    events.length = 0;
    await streaks.announce(u);
    expect(events).toEqual([
      {
        userId: u,
        t: 'STREAK_UPDATE',
        d: {
          current_streak_days: 1,
          longest_streak_days: 1,
          today_minutes: 16,
        },
      },
    ]);
  });
});
