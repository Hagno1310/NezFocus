import { addDays } from '@nezfocus/shared';

export type StoredStreak = {
  current: number;
  longest: number;
  last: string | null;
};

// REQ-STUDY-03: the run of consecutive Qualified Days ending at the latest one.
export function streakRun(qualifiedAsc: string[]): StoredStreak {
  let current = 0;
  let longest = 0;
  let last: string | null = null;
  for (const d of qualifiedAsc) {
    current = last !== null && addDays(last, 1) === d ? current + 1 : 1;
    longest = Math.max(longest, current);
    last = d;
  }
  return { current, longest, last };
}

// STUDY-03 AC2: worked out on read, so no 00:00 job: the run counts only while it reaches yesterday.
export const visibleStreak = (s: StoredStreak, today: string) =>
  s.last !== null && s.last >= addDays(today, -1) ? s.current : 0;
