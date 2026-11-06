import type { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { StudyStatsRepository } from '../src/modules/study/study-stats.repository.js';
import { dailyStudyStats } from '../src/modules/study/study.schema.js';
import { UsersRepository } from '../src/modules/users/users.repository.js';
import { userSettings } from '../src/modules/users/users.schema.js';
import { createTestApp, uniqueEmail } from './helpers.js';

// REQ-STUDY-15 write path against the real schema. Needs `pnpm dev:infra`.
describe('daily_study_stats credit (e2e)', () => {
  let app: INestApplication;
  let db: Db;
  let stats: StudyStatsRepository;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DB);
    stats = app.get(StudyStatsRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  const newUser = async (timezone = 'Asia/Ho_Chi_Minh') => {
    const id = app.get(SnowflakeGenerator).next();
    await app
      .get(UsersRepository)
      .createVerified({ id, email: uniqueEmail(), now: new Date() });
    await db
      .update(userSettings)
      .set({ timezone })
      .where(eq(userSettings.userId, id));
    return id;
  };

  const minutes = (startIso: string, m: number) => {
    const start = new Date(startIso);
    return { start, end: new Date(start.getTime() + m * 60_000) };
  };

  const day = async (userId: bigint, localDate: string) => {
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

  it('adds up sessions per local day and splits at local midnight', async () => {
    const userId = await newUser();
    // 20:00 local, 25 min of Room Session.
    await stats.credit({
      userId,
      source: 'room',
      intervals: [minutes('2026-11-06T13:00:00Z', 25)],
    });
    // 23:50 → 00:15 local, Solo Session.
    await stats.credit({
      userId,
      source: 'solo',
      intervals: [minutes('2026-11-06T16:50:00Z', 25)],
    });

    expect(await day(userId, '2026-11-06')).toMatchObject({
      timezone: 'Asia/Ho_Chi_Minh',
      focusedSeconds: 1500 + 600,
      soloSeconds: 600,
    });
    expect(await day(userId, '2026-11-07')).toMatchObject({
      focusedSeconds: 900,
      soloSeconds: 900,
    });
  });

  it('never stores more than 16 hours a day, even under concurrent credits', async () => {
    const userId = await newUser();
    // Three 6-hour credits for the same local day (07:00 → 13:00 each) land at once.
    await Promise.all(
      [1, 2, 3].map(() =>
        stats.credit({
          userId,
          source: 'room',
          intervals: [minutes('2026-11-06T00:00:00Z', 6 * 60)],
        }),
      ),
    );
    expect(await day(userId, '2026-11-06')).toMatchObject({
      focusedSeconds: 16 * 3600,
    });
  });

  it('commits with the caller transaction or not at all', async () => {
    const userId = await newUser();
    await db
      .transaction(async (tx) => {
        await stats.credit(
          {
            userId,
            source: 'solo',
            intervals: [minutes('2026-11-06T03:00:00Z', 25)],
          },
          tx,
        );
        throw new Error('caller failed');
      })
      .catch(() => undefined);
    expect(await day(userId, '2026-11-06')).toBeUndefined();
  });
});
