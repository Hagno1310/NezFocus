import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { userSettings } from '../users/users.schema.js';
import {
  creditFocus,
  type DayCredit,
  type FocusInterval,
} from './focused-time.js';
import { dailyStudyStats } from './study.schema.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type FocusCredit = {
  userId: bigint;
  intervals: FocusInterval[];
  source: 'solo' | 'room';
};

// REQ-STUDY-15: the one place focus time reaches daily_study_stats.
@Injectable()
export class StudyStatsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Pass the caller's transaction to commit together with its session row (savepoint).
  credit(
    input: FocusCredit,
    executor: Db | Tx = this.db,
  ): Promise<DayCredit[]> {
    return executor.transaction(async (tx) => {
      // Locking the settings row serialises credits per user, so the cap holds under races.
      const [settings] = await tx
        .select({ timezone: userSettings.timezone })
        .from(userSettings)
        .where(eq(userSettings.userId, input.userId))
        .for('update');
      if (!settings) throw new Error(`no user_settings for ${input.userId}`);
      const { timezone } = settings;

      const dates = creditFocus(input.intervals, timezone, {}).map(
        (c) => c.localDate,
      );
      if (dates.length === 0) return [];
      const existing = await tx
        .select({
          localDate: dailyStudyStats.localDate,
          focusedSeconds: dailyStudyStats.focusedSeconds,
        })
        .from(dailyStudyStats)
        .where(
          and(
            eq(dailyStudyStats.userId, input.userId),
            inArray(dailyStudyStats.localDate, dates),
          ),
        );
      const credits = creditFocus(
        input.intervals,
        timezone,
        Object.fromEntries(
          existing.map((r) => [r.localDate, r.focusedSeconds]),
        ),
      );

      const solo = input.source === 'solo';
      for (const { localDate, seconds } of credits) {
        await tx
          .insert(dailyStudyStats)
          .values({
            userId: input.userId,
            localDate,
            timezone,
            focusedSeconds: seconds,
            soloSeconds: solo ? seconds : 0,
          })
          .onConflictDoUpdate({
            target: [dailyStudyStats.userId, dailyStudyStats.localDate],
            set: {
              // SRS 8.2 v1.3: LEAST keeps the CHECK even if a caller skipped the cap.
              focusedSeconds: sql`LEAST(${dailyStudyStats.focusedSeconds} + ${seconds}, 57600)`,
              soloSeconds: sql`${dailyStudyStats.soloSeconds} + ${solo ? seconds : 0}`,
            },
          });
      }
      return credits;
    });
  }
}
