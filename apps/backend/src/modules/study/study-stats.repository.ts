import { Inject, Injectable } from '@nestjs/common';
import {
  DAILY_FOCUS_CAP_SECONDS,
  QUALIFIED_DAY_MINUTES,
} from '@nezfocus/shared';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { DB, type Db, type Tx } from '../../db/db.module.js';
import { userSettings } from '../users/users.schema.js';
import {
  creditFocus,
  type DayCredit,
  type FocusInterval,
  localDate,
} from './focused-time.js';
import { streakRun, type StoredStreak } from './streak.js';
import { dailyStudyStats, userStudyStreaks } from './study.schema.js';

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
        if (seconds === 0) continue;
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
              // REQ-STUDY-15 (4): LEAST keeps the CHECK even if a caller skipped the cap; solo takes the same clipped delta.
              focusedSeconds: sql`LEAST(${dailyStudyStats.focusedSeconds} + ${seconds}, ${DAILY_FOCUS_CAP_SECONDS})`,
              soloSeconds: solo
                ? sql`${dailyStudyStats.soloSeconds} + LEAST(${seconds}, ${DAILY_FOCUS_CAP_SECONDS} - ${dailyStudyStats.focusedSeconds})`
                : dailyStudyStats.soloSeconds,
            },
          });
      }
      await this.saveStreak(tx, input.userId);
      return credits;
    });
  }

  // DEC-24: recomputed in the credit transaction, so the streak rises the moment a day reaches 15 minutes.
  // ponytail: reads every Qualified Day of the user per credit; keep a running count if users reach thousands of days.
  private async saveStreak(tx: Tx, userId: bigint) {
    const rows = await tx
      .select({ localDate: dailyStudyStats.localDate })
      .from(dailyStudyStats)
      .where(
        and(
          eq(dailyStudyStats.userId, userId),
          gte(dailyStudyStats.focusedSeconds, QUALIFIED_DAY_MINUTES * 60),
        ),
      )
      .orderBy(asc(dailyStudyStats.localDate));
    const run = streakRun(rows.map((r) => r.localDate));
    const values = {
      currentStreakDays: run.current,
      longestStreakDays: run.longest,
      lastQualifiedDate: run.last,
    };
    await tx
      .insert(userStudyStreaks)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: userStudyStreaks.userId,
        set: {
          ...values,
          longestStreakDays: sql`GREATEST(${userStudyStreaks.longestStreakDays}, ${run.longest})`,
        },
      });
  }

  // Today as the user's time zone has it, the stored run, and today's seconds.
  async streakSnapshot(userId: bigint, now: Date) {
    const [settings] = await this.db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    const timezone = settings?.timezone ?? 'Asia/Ho_Chi_Minh';
    const today = localDate(now.getTime(), timezone);
    const [streak] = await this.db
      .select()
      .from(userStudyStreaks)
      .where(eq(userStudyStreaks.userId, userId));
    const [day] = await this.db
      .select({ focusedSeconds: dailyStudyStats.focusedSeconds })
      .from(dailyStudyStats)
      .where(
        and(
          eq(dailyStudyStats.userId, userId),
          eq(dailyStudyStats.localDate, today),
        ),
      );
    const stored: StoredStreak = {
      current: streak?.currentStreakDays ?? 0,
      longest: streak?.longestStreakDays ?? 0,
      last: streak?.lastQualifiedDate ?? null,
    };
    return { timezone, today, stored, todaySeconds: day?.focusedSeconds ?? 0 };
  }
}
