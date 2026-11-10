import { streakRun, visibleStreak } from './streak.js';

describe('streak (REQ-STUDY-03)', () => {
  it('counts consecutive Qualified Days ending at the latest one', () => {
    expect(streakRun([])).toEqual({ current: 0, longest: 0, last: null });
    expect(
      streakRun([
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-05',
        '2026-10-06',
      ]),
    ).toEqual({ current: 2, longest: 3, last: '2026-10-06' });
    // Across a month and a year.
    expect(streakRun(['2025-12-31', '2026-01-01']).current).toBe(2);
  });

  it('AC1: yesterday qualified keeps the streak today before 15 minutes', () => {
    const s = streakRun(['2026-10-17']);
    expect(visibleStreak(s, '2026-10-18')).toBe(1);
    expect(
      visibleStreak(streakRun(['2026-10-17', '2026-10-18']), '2026-10-18'),
    ).toBe(2);
  });

  it('AC2: yesterday not qualified → 0 from 00:00 today', () => {
    const s = streakRun(['2026-10-15', '2026-10-16']);
    expect(visibleStreak(s, '2026-10-18')).toBe(0);
    expect(visibleStreak(streakRun([]), '2026-10-18')).toBe(0);
  });
});
