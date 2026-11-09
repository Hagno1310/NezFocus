import { addDays } from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import type { SeedContext } from '../../db/seed.js';
import { users } from '../users/users.schema.js';
import { streakRun } from './streak.js';
import { dailyStudyStats, userStudyStreaks } from './study.schema.js';

// docs/design/screens/04-tab-hoc.md › Thống kê mẫu, as minutes per day for An: [focused, solo].
const weeks: Record<string, [number, number][]> = {
  '2026-10-12': [
    [0, 0],
    [50, 26],
    [40, 0],
    [35, 35],
    [60, 0],
    [45, 0],
    [45, 14],
  ],
  '2026-10-05': [
    [20, 20],
    [0, 0],
    [25, 0],
    [15, 0],
    [10, 10],
    [30, 0],
    [15, 15],
  ],
  '2026-09-28': [
    [15, 0],
    [30, 0],
    [0, 0],
    [30, 0],
    [0, 0],
    [45, 15],
    [40, 0],
  ],
  '2026-09-21': [
    [20, 0],
    [0, 0],
    [15, 0],
    [10, 0],
    [25, 0],
    [0, 0],
    [30, 0],
  ],
  '2026-09-14': [
    [30, 0],
    [25, 0],
    [0, 0],
    [40, 0],
    [20, 0],
    [15, 0],
    [0, 0],
  ],
};

function sampleDays() {
  const out = new Map<string, [number, number]>();
  for (const [monday, mins] of Object.entries(weeks))
    mins.forEach((m, i) => out.set(addDays(monday, i), m));
  // 1–18/9 = 9 h 10 min; 2/9–15/9 is the 14-day longest streak ("Dài nhất 14 ngày").
  out.set('2026-09-01', [10, 0]);
  for (let i = 2; i <= 13; i++)
    out.set(`2026-09-${String(i).padStart(2, '0')}`, [i <= 8 ? 35 : 36, 0]);
  // The rest of "Từ trước tới nay 86 giờ 12 phút", every other day from before 12/2025 (no long run).
  const known = [...out.values()].reduce((n, [m]) => n + m, 0);
  let rest = 86 * 60 + 12 - known;
  for (let d = '2025-11-03'; rest > 0; d = addDays(d, 2)) {
    out.set(d, [Math.min(30, rest), 0]);
    rest -= 30;
  }
  return out;
}

// REQ-STUDY-03/17 sample minutes, so S-STUDY-01 / S-STUDY-03 against the real backend match the frames
// when the phone's date is Sunday 18/10/2026.
export async function seedStudy({ db }: SeedContext) {
  const [an] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, 'an.nguyen'));
  if (!an) return;
  const days = sampleDays();
  await db
    .insert(dailyStudyStats)
    .values(
      [...days].map(([localDate, [focused, solo]]) => ({
        userId: an.id,
        localDate,
        timezone: 'Asia/Ho_Chi_Minh',
        focusedSeconds: focused * 60,
        soloSeconds: solo * 60,
      })),
    )
    .onConflictDoNothing();
  const run = streakRun(
    [...days]
      .filter(([, [m]]) => m >= 15)
      .map(([d]) => d)
      .sort(),
  );
  await db
    .insert(userStudyStreaks)
    .values({
      userId: an.id,
      currentStreakDays: run.current,
      longestStreakDays: run.longest,
      lastQualifiedDate: run.last,
    })
    .onConflictDoNothing();
  console.log(`study: An's sample minutes on ${days.size} days`);
}
