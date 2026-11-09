import { parseDispatch } from '../gateway/events.contract.js';
import {
  averageMinutesPerDay,
  formatAllTime,
  formatMinutes,
  formatSessionSeconds,
  StudySessionsQuery,
  StudyStatsQuery,
} from './stats.contract.js';

describe('study stats contract (REQ-STUDY-17)', () => {
  it('AC6: rejects view=year and limit=100', () => {
    expect(
      StudyStatsQuery.safeParse({ view: 'year', date: '2026-10-18' }).success,
    ).toBe(false);
    expect(StudySessionsQuery.safeParse({ limit: '100' }).success).toBe(false);
    expect(StudySessionsQuery.safeParse({ limit: '0' }).success).toBe(false);
    expect(
      StudyStatsQuery.safeParse({ view: 'week', date: '18/10/2026' }).success,
    ).toBe(false);
  });

  it('reads query strings; limit defaults to 20, date defaults to today', () => {
    expect(StudySessionsQuery.parse({})).toEqual({ limit: 20 });
    expect(
      StudySessionsQuery.parse({
        from: '2026-10-12',
        to: '2026-10-18',
        limit: '50',
      }),
    ).toEqual({ from: '2026-10-12', to: '2026-10-18', limit: 50 });
    expect(StudyStatsQuery.parse({ view: 'month' })).toEqual({ view: 'month' });
  });

  it('formats minutes as "1 giờ 40 phút"', () => {
    expect(formatMinutes(100)).toBe('1 giờ 40 phút');
    expect(formatMinutes(45)).toBe('45 phút');
    expect(formatMinutes(0)).toBe('0 phút');
    expect(formatMinutes(60)).toBe('1 giờ');
    expect(formatMinutes(275)).toBe('4 giờ 35 phút');
  });

  it('"Từ trước tới nay": hours + minutes under 10 hours, hours only from 10', () => {
    expect(formatAllTime(505)).toBe('8 giờ 25 phút');
    expect(formatAllTime(599)).toBe('9 giờ 59 phút');
    expect(formatAllTime(600)).toBe('10 giờ');
    expect(formatAllTime(86 * 60 + 12)).toBe('86 giờ');
  });

  it('session rows: 1–59 seconds read "dưới 1 phút"', () => {
    expect(formatSessionSeconds(1)).toBe('dưới 1 phút');
    expect(formatSessionSeconds(59)).toBe('dưới 1 phút');
    expect(formatSessionSeconds(60)).toBe('1 phút');
    expect(formatSessionSeconds(31 * 60 + 59)).toBe('31 phút');
    expect(formatSessionSeconds(65 * 60)).toBe('1 giờ 5 phút');
  });

  it('AC2: average = total ÷ days elapsed incl. today, rounded down', () => {
    // Wednesday 14/10: Mon–Wed elapsed.
    expect(
      averageMinutesPerDay(118, {
        from: '2026-10-12',
        to: '2026-10-18',
        today: '2026-10-14',
      }),
    ).toBe(39);
    // A past week divides by all 7 days.
    expect(
      averageMinutesPerDay(115, {
        from: '2026-10-05',
        to: '2026-10-11',
        today: '2026-10-18',
      }),
    ).toBe(16);
    // Month 1–18/10 with 8 h 25 min.
    expect(
      averageMinutesPerDay(505, {
        from: '2026-10-01',
        to: '2026-10-31',
        today: '2026-10-18',
      }),
    ).toBe(28);
  });

  it('STREAK_UPDATE is a known Gateway event', () => {
    const d = {
      current_streak_days: 7,
      longest_streak_days: 14,
      today_minutes: 15,
    };
    expect(parseDispatch({ op: 0, t: 'STREAK_UPDATE', s: 3, d })).toEqual({
      t: 'STREAK_UPDATE',
      s: 3,
      d,
    });
    expect(() =>
      parseDispatch({
        op: 0,
        t: 'STREAK_UPDATE',
        s: 4,
        d: { current_streak_days: '7' },
      }),
    ).toThrow();
  });
});
