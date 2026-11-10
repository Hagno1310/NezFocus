import {
  addDays,
  type StudySessionRow,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  canGoBack,
  canGoForward,
  comparison,
  isMilestone,
  liveFocusSeconds,
  msUntilMidnight,
  monthRows,
  sessionLine,
  stepDate,
  todayProgress,
  weekChart,
  weekRange,
  withLiveFocus,
} from './stats';
import type { SoloTimer } from './solo';

// 04 › Thống kê mẫu: week 12/10–18/10, 21:47 Sunday 18/10/2026.
const week = [0, 50, 40, 35, 60, 45, 45];
const days = (mins: number[], from = '2026-10-12') =>
  mins.map((m, i) => ({
    local_date: addDays(from, i),
    focused_minutes: m,
    solo_minutes: 0,
  }));

const stats = (over: Partial<StudyStatsResponse> = {}): StudyStatsResponse => ({
  view: 'week',
  timezone: 'Asia/Ho_Chi_Minh',
  today: '2026-10-18',
  from: '2026-10-12',
  to: '2026-10-18',
  days: days(week),
  total_minutes: 275,
  room_minutes: 200,
  solo_minutes: 75,
  previous_minutes: 115,
  all_time_minutes: 5172,
  first_date: '2025-11-02',
  current_streak_days: 6,
  longest_streak_days: 14,
  today_minutes: 45,
  ...over,
});

const timer = (over: Partial<SoloTimer> = {}): SoloTimer => ({
  status: 'running',
  phase: 'focus',
  remainingMs: (32 * 60 + 10) * 1000,
  totalMs: 50 * 60_000,
  round: 1,
  next: null,
  long: false,
  pending: null,
  due: false,
  ...over,
});

describe('live focus (REQ-STUDY-03 v1.9: progress moves every minute of focus)', () => {
  it('counts the running focus stretch; nothing in a break or pause', () => {
    expect(liveFocusSeconds(timer())).toBe(17 * 60 + 50);
    expect(liveFocusSeconds(timer({ phase: 'short_break' }))).toBe(0);
    expect(liveFocusSeconds(timer({ status: 'paused' }))).toBe(0);
    expect(liveFocusSeconds(null)).toBe(0);
  });

  it('leaves out what a pause already credited in this phase', () => {
    expect(liveFocusSeconds(timer(), 10 * 60_000)).toBe(7 * 60 + 50);
  });

  it('solo-running: CN 14 + 17 = 31, week 4 giờ 21 phút', () => {
    const s = withLiveFocus(
      stats({
        days: days([0, 50, 40, 35, 60, 45, 14]),
        total_minutes: 244,
        today_minutes: 14,
        current_streak_days: 5,
      }),
      17 * 60 + 50,
    );
    expect(s.today_minutes).toBe(31);
    expect(s.days[6]!.focused_minutes).toBe(31);
    expect(s.total_minutes).toBe(261);
    // AC: the streak rises the moment today reaches 15 minutes.
    expect(s.current_streak_days).toBe(6);
  });

  it('does not bump the streak again once today already counted', () => {
    expect(withLiveFocus(stats(), 600).current_streak_days).toBe(6);
  });
});

describe('today progress (C-37, STUDY-03 AC6)', () => {
  it('14 is below, 15 reached and full', () => {
    expect(todayProgress(14)).toEqual({ reached: false, ratio: 14 / 15 });
    expect(todayProgress(15)).toEqual({ reached: true, ratio: 1 });
    expect(todayProgress(45).ratio).toBe(1);
  });
});

describe('week chart (04 › Biểu đồ tuần)', () => {
  it('scale is the highest column; today is primary; columns add up to the total', () => {
    const { bars, line } = weekChart(days(week), '2026-10-18');
    expect(bars[4]!.height).toBe(1);
    expect(line).toBe(15 / 60);
    expect(bars.map((b) => b.tone)).toEqual([
      'below',
      'reached',
      'reached',
      'reached',
      'reached',
      'reached',
      'today',
    ]);
    expect(bars.reduce((n, b) => n + b.minutes, 0)).toBe(275);
  });

  it('empty-week: scale 15 puts the line at the top; future days have no column', () => {
    const { bars, line } = weekChart(days([0, 0, 0, 0, 0, 0, 0]), '2026-10-14');
    expect(line).toBe(1);
    expect(bars.map((b) => b.future)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
  });

  it('today at 0 minutes is a flat border bar, like any 0 (frame empty-week, streak-zero)', () => {
    const { bars } = weekChart(days([0, 0, 0, 0, 0, 0, 0]), '2026-10-14');
    expect(bars[2]!.tone).toBe('below');
    expect(bars[2]!.today).toBe(true);
  });

  it('week-spike: 540 sets the scale', () => {
    const { line } = weekChart(
      days([15, 20, 540, 40, 25, 30, 15]),
      '2026-10-18',
    );
    expect(line).toBeCloseTo(15 / 540);
  });
});

describe('month calendar (C-38)', () => {
  it('October 2026 starts on Thursday: 3 empty cells, 5 rows', () => {
    const oct = Array.from({ length: 31 }, (_, i) => ({
      local_date: addDays('2026-10-01', i),
      focused_minutes: i === 1 ? 0 : 30,
      solo_minutes: 0,
    }));
    const rows = monthRows(oct, '2026-10-18');
    expect(rows).toHaveLength(5);
    expect(rows[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(rows[0]![4]).toMatchObject({ day: 2, state: 'below' });
    expect(rows[2]![6]).toMatchObject({ day: 18, today: true });
    expect(rows[3]![0]).toMatchObject({ day: 19, state: 'future' });
  });
});

describe('comparison (REQ-STUDY-17 AC1)', () => {
  it('+2 giờ 40 phút, previous 0, equal, first period', () => {
    expect(comparison(stats())).toEqual({ kind: 'diff', minutes: 160 });
    expect(comparison(stats({ previous_minutes: 0 }))).toEqual({
      kind: 'none-before',
    });
    expect(comparison(stats({ previous_minutes: 275 }))).toEqual({
      kind: 'equal',
    });
    expect(comparison(stats({ first_date: '2026-10-13' }))).toEqual({
      kind: 'hidden',
    });
    expect(comparison(stats({ first_date: null }))).toEqual({
      kind: 'hidden',
    });
  });
});

describe('choosing a period (S-STUDY-03)', () => {
  it('› off on the current period, ‹ off on the first period with data', () => {
    expect(canGoForward(stats())).toBe(false);
    expect(canGoBack(stats())).toBe(true);
    expect(canGoBack(stats({ first_date: '2026-10-12' }))).toBe(false);
    expect(canGoBack(stats({ first_date: null }))).toBe(false);
    expect(canGoForward(stats({ from: '2026-10-05', to: '2026-10-11' }))).toBe(
      true,
    );
  });

  it('steps a week or a month and never past today', () => {
    expect(stepDate('week', '2026-10-18', -1, '2026-10-18')).toBe('2026-10-11');
    expect(stepDate('month', '2026-10-18', -1, '2026-10-18')).toBe(
      '2026-09-01',
    );
    expect(stepDate('month', '2026-09-01', 1, '2026-10-18')).toBe('2026-10-01');
    expect(stepDate('week', '2026-10-14', 1, '2026-10-18')).toBe('2026-10-18');
  });

  it('year-boundary: a week across years carries the years', () => {
    expect(weekRange('2026-10-12', '2026-10-18', '2026-10-18')).toBe(
      '12/10 – 18/10',
    );
    expect(weekRange('2025-12-29', '2026-01-04', '2026-10-18')).toBe(
      '29/12/2025 – 04/01/2026',
    );
  });

  it('milestones 7 / 30 / 100', () => {
    expect([6, 7, 30, 100, 101].map(isMilestone)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe('history line (C-39, REQ-STUDY-17 AC3–AC4)', () => {
  const row = (over: Partial<StudySessionRow>): StudySessionRow => ({
    id: '1',
    kind: 'solo',
    room: null,
    started_at: '2026-10-17T13:00:00Z',
    ended_at: '2026-10-17T13:50:00Z',
    join_count: 1,
    focused_seconds: 3000,
    days: [{ local_date: '2026-10-17', focused_seconds: 3000 }],
    ...over,
  });

  it('T7 17/10 · 20:00 – 20:50 in the user time zone', () => {
    expect(
      sessionLine(row({}), 'Asia/Ho_Chi_Minh', '2026-10-18', '2026-10-18'),
    ).toEqual({
      weekday: 5,
      date: '17/10',
      start: '20:00',
      end: '20:50',
      endWeekday: null,
      joins: 1,
      laterMinutes: 0,
    });
  });

  it('midnight-history: 23:30 – 00:40 (T2), 40 phút tính cho tuần sau', () => {
    const l = sessionLine(
      row({
        started_at: '2026-10-18T16:30:00Z',
        ended_at: '2026-10-18T17:40:00Z',
        days: [
          { local_date: '2026-10-18', focused_seconds: 1800 },
          { local_date: '2026-10-19', focused_seconds: 2400 },
        ],
      }),
      'Asia/Ho_Chi_Minh',
      '2026-10-19',
      '2026-10-18',
    );
    expect(l).toMatchObject({
      weekday: 6,
      start: '23:30',
      end: '00:40',
      endWeekday: 0,
      laterMinutes: 40,
    });
  });

  it('running rows have no end; other years carry the year', () => {
    const l = sessionLine(
      row({ started_at: '2025-12-31T13:00:00Z', ended_at: null }),
      'Asia/Ho_Chi_Minh',
      '2026-10-18',
      '2026-01-04',
    );
    expect(l).toMatchObject({ date: '31/12/2025', end: null });
  });
});

describe('midnight (S-STUDY-03 › Qua nửa đêm)', () => {
  it('counts to 00:00 in the user time zone, not the phone', () => {
    // 23:30:15 in Ho Chi Minh City = 16:30:15 UTC.
    expect(
      msUntilMidnight(new Date('2026-10-18T16:30:15Z'), 'Asia/Ho_Chi_Minh'),
    ).toBe(29 * 60_000 + 45_000);
  });
});
