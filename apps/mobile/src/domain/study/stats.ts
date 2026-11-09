import {
  addDays,
  periodOf,
  QUALIFIED_DAY_MINUTES,
  type StatsView,
  type StudyDay,
  type StudySessionRow,
  type StudySessionsQuery,
  type StudySessionsResponse,
  type StudyStatsQuery,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import type { SoloTimer } from './solo';

export interface StudyStatsRepository {
  stats(q: StudyStatsQuery): Promise<StudyStatsResponse>;
  sessions(q: Partial<StudySessionsQuery>): Promise<StudySessionsResponse>;
}

const Q = QUALIFIED_DAY_MINUTES;

// 0 = Monday … 6 = Sunday (REQ-STUDY-17: weeks run Mon–Sun).
export const weekdayOf = (d: string) =>
  (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

// REQ-STUDY-03 (v1.9): today's progress moves every minute of focus; the backend only credits at
// phase end / pause / stop (DEC-24), so the running stretch is added here until it does.
export function liveFocusSeconds(
  timer: SoloTimer | null,
  creditedInPhaseMs = 0,
) {
  if (!timer || timer.status !== 'running' || timer.phase !== 'focus') return 0;
  return Math.max(
    0,
    Math.floor((timer.totalMs - timer.remainingMs - creditedInPhaseMs) / 1000),
  );
}

export function withLiveFocus(
  s: StudyStatsResponse,
  seconds: number,
): StudyStatsResponse {
  const m = Math.floor(seconds / 60);
  if (m <= 0) return s;
  const inPeriod = s.today >= s.from && s.today <= s.to;
  const today_minutes = s.today_minutes + m;
  // The streak counts today once it reaches 15 minutes (spec 04 › Dữ liệu nhất quán).
  const crossed = s.today_minutes < Q && today_minutes >= Q;
  const current_streak_days = s.current_streak_days + (crossed ? 1 : 0);
  return {
    ...s,
    today_minutes,
    current_streak_days,
    longest_streak_days: Math.max(s.longest_streak_days, current_streak_days),
    days: s.days.map((d) =>
      d.local_date === s.today
        ? {
            ...d,
            focused_minutes: d.focused_minutes + m,
            solo_minutes: d.solo_minutes + m,
          }
        : d,
    ),
    total_minutes: s.total_minutes + (inPeriod ? m : 0),
    solo_minutes: s.solo_minutes + (inPeriod ? m : 0),
    all_time_minutes: s.all_time_minutes + m,
    first_date: s.first_date ?? s.today,
  };
}

export const todayProgress = (minutes: number) => ({
  reached: minutes >= Q,
  ratio: Math.min(1, minutes / Q),
});

export type DayTone = 'today' | 'reached' | 'below';
export type Bar = {
  date: string;
  minutes: number;
  height: number; // share of the chart height, 0–1
  tone: DayTone;
  future: boolean;
};

// 04 › Biểu đồ tuần: scale = max(highest column, 15) so the 15-minute line stays inside.
export function weekChart(days: readonly StudyDay[], today: string) {
  const scale = Math.max(Q, ...days.map((d) => d.focused_minutes));
  const bars: Bar[] = days.map((d) => ({
    date: d.local_date,
    minutes: d.focused_minutes,
    height: d.focused_minutes / scale,
    tone:
      d.local_date === today
        ? 'today'
        : d.focused_minutes >= Q
          ? 'reached'
          : 'below',
    future: d.local_date > today,
  }));
  return { bars, line: Q / scale };
}

export type CellState = 'reached' | 'below' | 'future';
export type DayCell = {
  date: string;
  day: number;
  minutes: number;
  state: CellState;
  today: boolean;
};

const cellOf = (d: StudyDay, today: string): DayCell => ({
  date: d.local_date,
  day: Number(d.local_date.slice(8)),
  minutes: d.focused_minutes,
  state:
    d.local_date > today
      ? 'future'
      : d.focused_minutes >= Q
        ? 'reached'
        : 'below',
  today: d.local_date === today,
});

// One row of the 4-week grid (S-STUDY-03, week view only).
export const weekCells = (days: readonly StudyDay[], today: string) =>
  days.map((d) => cellOf(d, today));

// C-38: rows of 7 from Monday; days outside the month are null (no cell).
export function monthRows(days: readonly StudyDay[], today: string) {
  const cells: (DayCell | null)[] = [
    ...Array<null>(days[0] ? weekdayOf(days[0].local_date) : 0).fill(null),
    ...days.map((d) => cellOf(d, today)),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );
}

export type Comparison =
  | { kind: 'hidden' }
  | { kind: 'none-before' }
  | { kind: 'equal' }
  | { kind: 'diff'; minutes: number };

// REQ-STUDY-17 AC1: the first period with data has no comparison line.
export function comparison(s: StudyStatsResponse): Comparison {
  if (!s.first_date || s.first_date >= s.from) return { kind: 'hidden' };
  if (s.previous_minutes === 0) return { kind: 'none-before' };
  const diff = s.total_minutes - s.previous_minutes;
  return diff ? { kind: 'diff', minutes: diff } : { kind: 'equal' };
}

export const isCurrentPeriod = (s: { to: string; today: string }) =>
  s.today <= s.to;

// "‹" stops at the first period with data, "›" at the current one (S-STUDY-03 › Thể hiện kỳ).
export const canGoBack = (s: { first_date: string | null; from: string }) =>
  !!s.first_date && s.first_date < s.from;
export const canGoForward = (s: { to: string; today: string }) =>
  s.to < s.today;

// The date being viewed survives Tuần ↔ Tháng; a step never goes past today.
export function stepDate(
  view: StatsView,
  date: string,
  dir: -1 | 1,
  today: string,
) {
  const p = periodOf(view, date);
  const next =
    view === 'week'
      ? addDays(date, 7 * dir)
      : dir < 0
        ? periodOf('month', addDays(p.from, -1)).from
        : addDays(p.to, 1);
  return next > today ? today : next;
}

const ddmm = (d: string, year: boolean) =>
  `${d.slice(8, 10)}/${d.slice(5, 7)}${year ? `/${d.slice(0, 4)}` : ''}`;

// "12/10 – 18/10"; a week not wholly in this year carries years: "29/12/2025 – 04/01/2026".
export function weekRange(from: string, to: string, today: string) {
  const y = today.slice(0, 4);
  const year = from.slice(0, 4) !== y || to.slice(0, 4) !== y;
  return `${ddmm(from, year)} – ${ddmm(to, year)}`;
}

// "10/2026" for "Tháng 10/2026".
export const monthLabel = (from: string) =>
  `${from.slice(5, 7)}/${from.slice(0, 4)}`;

export const MILESTONES = [7, 30, 100];
export const isMilestone = (streak: number) => MILESTONES.includes(streak);

// Local wall time of an instant in the user's time zone (history follows study-stats.timezone).
const formatters = new Map<string, Intl.DateTimeFormat>();
export function localTime(iso: string, timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  const p = Object.fromEntries(
    f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}

export type SessionLine = {
  weekday: number;
  date: string; // "17/10", or "31/12/2025" outside this year
  start: string;
  end: string | null; // null = running ("– bây giờ")
  endWeekday: number | null; // ended on another day: "00:40 (T2)"
  joins: number; // > 1: "· vào 2 lần"
  laterMinutes: number; // > 0: "(40 phút tính cho tuần sau)"
};

// C-39 / REQ-STUDY-17 AC3–AC4: the second line of a history row.
export function sessionLine(
  row: StudySessionRow,
  timeZone: string,
  today: string,
  periodTo: string,
): SessionLine {
  const start = localTime(row.started_at, timeZone);
  const end = row.ended_at ? localTime(row.ended_at, timeZone) : null;
  const later = row.days
    .filter((d) => d.local_date > periodTo)
    .reduce((n, d) => n + d.focused_seconds, 0);
  return {
    weekday: weekdayOf(start.date),
    date: ddmm(start.date, start.date.slice(0, 4) !== today.slice(0, 4)),
    start: start.time,
    end: end?.time ?? null,
    endWeekday: end && end.date !== start.date ? weekdayOf(end.date) : null,
    joins: row.join_count,
    laterMinutes: Math.floor(later / 60),
  };
}
