import {
  addDays,
  daysBetween,
  periodOf,
  previousPeriod,
  type StudySessionRow,
} from '@nezfocus/shared';
import type { StudyStatsRepository } from '../../domain/study/stats';

// EXPO_PUBLIC_FAKE=study (WORKFLOW 4.2): 04 › Thống kê mẫu, frozen at 21:47 Sunday 18/10/2026.
const TODAY = '2026-10-18';
const TZ = 'Asia/Ho_Chi_Minh';

// [focused, solo] minutes per day from 01/09; weeks of the sample, solo split matching the history.
const MINUTES: [number, number][] = [
  ...[40, 30, 35, 30, 40, 30, 35, 30, 40, 30, 35, 30, 30].map(
    (m): [number, number] => [m, 0],
  ),
  ...[30, 25, 0, 40, 20, 15, 0].map((m): [number, number] => [m, 0]),
  ...[20, 0, 15, 10, 25, 0, 30].map((m): [number, number] => [m, 0]),
  [15, 0],
  [30, 0],
  [0, 0],
  [30, 0],
  [0, 0],
  [45, 0],
  [40, 15],
  [20, 20],
  [0, 0],
  [25, 0],
  [15, 0],
  [10, 10],
  [30, 0],
  [15, 15],
  [0, 0],
  [50, 26],
  [40, 0],
  [35, 35],
  [60, 0],
  [45, 0],
  [45, 14],
];
const START = '2026-09-01';
const BEFORE_MINUTES = 5172 - MINUTES.reduce((n, [m]) => n + m, 0);

const dayOf = (d: string) => {
  const i = daysBetween(START, d);
  const [focused, solo] = (d <= TODAY && MINUTES[i]) || [0, 0];
  return { local_date: d, focused_minutes: focused, solo_minutes: solo };
};

const range = (from: string, to: string) =>
  Array.from({ length: daysBetween(from, to) + 1 }, (_, i) =>
    dayOf(addDays(from, i)),
  );

const sum = (from: string, to: string) =>
  range(from, to).reduce((n, d) => n + d.focused_minutes, 0);

const at = (date: string, time: string) =>
  new Date(`${date}T${time}:00+07:00`).toISOString();

const room = (channel: string, server: string) => ({
  access: 'visible' as const,
  channel_name: channel,
  server_name: server,
});

let nextId = 1;
const row = (
  date: string,
  start: string,
  end: string | null,
  seconds: number,
  r: StudySessionRow['room'] = null,
  join_count = 1,
): StudySessionRow => ({
  id: String(nextId++),
  kind: r ? 'room' : 'solo',
  room: r,
  started_at: at(date, start),
  ended_at: end && at(date, end),
  join_count,
  focused_seconds: seconds,
  days: [{ local_date: date, focused_seconds: seconds }],
});

const GT2 = 'Ôn thi Giải tích 2';
// S-STUDY-03 `default` and S-STUDY-EDGE `history-rules`; running first, then newest.
const ROWS: StudySessionRow[] = [
  row('2026-10-18', '21:11', null, 31 * 60, room('Phòng học im lặng', GT2)),
  row('2026-10-18', '15:20', '15:34', 14 * 60),
  row('2026-10-17', '20:00', '20:50', 45 * 60, room('Phòng học im lặng', GT2)),
  row(
    '2026-10-16',
    '19:30',
    '20:40',
    60 * 60,
    room('Phòng thảo luận nhóm', 'Nhóm đồ án Mobile'),
  ),
  row('2026-10-15', '19:00', '19:35', 35 * 60),
  row('2026-10-14', '20:00', '20:40', 40 * 60, room('Phòng ôn tập 2', GT2)),
  row('2026-10-13', '21:00', '21:24', 24 * 60, room('Phòng ôn tập 2', GT2)),
  row('2026-10-13', '19:00', '19:26', 26 * 60),
  row('2026-10-11', '16:00', '16:15', 15 * 60),
  row(
    '2026-10-10',
    '19:00',
    '19:45',
    30 * 60,
    room('Phòng học im lặng', GT2),
    2,
  ),
  row('2026-10-09', '22:02', '22:03', 30),
  row('2026-10-09', '18:00', '18:10', 10 * 60),
  row('2026-10-08', '20:10', '20:25', 15 * 60, {
    access: 'deleted',
    channel_name: null,
    server_name: 'Nhóm đồ án Mobile',
  }),
  row('2026-10-07', '21:00', '21:25', 25 * 60, {
    access: 'hidden',
    channel_name: null,
    server_name: 'CLB Guitar PTIT',
  }),
  row('2026-10-05', '20:00', '20:20', 20 * 60),
];

const delay = <T>(v: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(v), 300));

export const fakeStudyStatsRepository: StudyStatsRepository = {
  stats: ({ view, date = TODAY }) => {
    const p = periodOf(view, date);
    const days = range(p.from, p.to);
    const prev = previousPeriod(view, p, TODAY);
    const total = days.reduce((n, d) => n + d.focused_minutes, 0);
    const solo = days.reduce((n, d) => n + d.solo_minutes, 0);
    return delay({
      view,
      timezone: TZ,
      today: TODAY,
      ...p,
      days,
      total_minutes: total,
      room_minutes: total - solo,
      solo_minutes: solo,
      previous_minutes: sum(prev.from, prev.to),
      all_time_minutes: BEFORE_MINUTES + sum(START, TODAY),
      first_date: '2025-11-02',
      current_streak_days: 6,
      longest_streak_days: 14,
      today_minutes: dayOf(TODAY).focused_minutes,
    });
  },
  sessions: ({ from = '0000-01-01', to = TODAY, before, limit = 20 }) => {
    const inRange = ROWS.filter((r) => {
      const d = r.days[0]!.local_date;
      return d >= from && d <= to;
    });
    const start = before ? Number(before) : 0;
    const page = inRange.slice(start, start + limit);
    const next = start + limit < inRange.length ? String(start + limit) : null;
    return delay({ study_sessions: page, next_cursor: next });
  },
};
