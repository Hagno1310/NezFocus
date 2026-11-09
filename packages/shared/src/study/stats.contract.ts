import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// REQ-STUDY-17: a whole week (Mon–Sun) or calendar month; no custom range, no year.
export const StatsView = z.enum(['week', 'month']);
export type StatsView = z.infer<typeof StatsView>;

// date: any day of the period, in user_settings.timezone; omitted = today.
export const StudyStatsQuery = z.object({
  view: StatsView,
  date: z.iso.date().optional(),
});
export type StudyStatsQuery = z.infer<typeof StudyStatsQuery>;

// REQ-STUDY-15 (1): minutes are the stored seconds rounded down per day, so the columns always add up to the totals.
export const StudyDay = z.object({
  local_date: z.iso.date(),
  focused_minutes: z.number().int(), // Room + Solo
  solo_minutes: z.number().int(),
});
export type StudyDay = z.infer<typeof StudyDay>;

// REQ-STUDY-03 (streak, today's progress) — also what the profile card reads (S-ME-02, P1-A4.4 #73).
export const StreakState = z.object({
  current_streak_days: z.number().int(), // 0 when yesterday was not a Qualified Day
  longest_streak_days: z.number().int(),
  today_minutes: z.number().int(),
});
export type StreakState = z.infer<typeof StreakState>;

export const StudyStatsResponse = StreakState.extend({
  view: StatsView,
  timezone: z.string(), // user_settings.timezone: every date and history time is local to it
  today: z.iso.date(),
  from: z.iso.date(), // first day of the period
  to: z.iso.date(), // last day, may be after today
  days: z.array(StudyDay), // every day from..to, future days 0
  total_minutes: z.number().int(),
  room_minutes: z.number().int(),
  solo_minutes: z.number().int(),
  // Running period: the same number of first days of the previous one; past period: all of it.
  previous_minutes: z.number().int(),
  all_time_minutes: z.number().int(),
  first_date: z.iso.date().nullable(), // first day with focus; null = never studied
});
export type StudyStatsResponse = z.infer<typeof StudyStatsResponse>;

// limit 1–50 (REQ-STUDY-17 AC6); before = next_cursor of the previous page.
export const StudySessionsQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  before: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type StudySessionsQuery = z.infer<typeof StudySessionsQuery>;

// REQ-STUDY-17 AC5: names as the user may see them now.
// visible "{room} · {server}" · deleted "Phòng đã bị xóa · {server}" · hidden "Một phòng của {server}" · gone "Phòng học".
export const SessionRoom = z.object({
  access: z.enum(['visible', 'deleted', 'hidden', 'gone']),
  channel_name: z.string().nullable(), // visible only
  server_name: z.string().nullable(), // visible, deleted, hidden
});
export type SessionRoom = z.infer<typeof SessionRoom>;

// One row per Solo Session, or per Room Session for this user (re-joins merged, AC3).
export const StudySessionRow = z.object({
  id: SnowflakeId, // solo_sessions.id or focus_sessions.id
  kind: z.enum(['room', 'solo']),
  room: SessionRoom.nullable(), // null for solo
  started_at: z.iso.datetime(), // room: first join
  ended_at: z.iso.datetime().nullable(), // null while running; room: last leave
  join_count: z.number().int(), // solo: 1
  focused_seconds: z.number().int(),
  // AC4: seconds per local day, so a row past midnight can say "(40 phút tính cho tuần sau)".
  days: z.array(
    z.object({ local_date: z.iso.date(), focused_seconds: z.number().int() }),
  ),
});
export type StudySessionRow = z.infer<typeof StudySessionRow>;

export const StudySessionsResponse = z.object({
  study_sessions: z.array(StudySessionRow), // running first, then newest started_at
  next_cursor: z.string().nullable(),
});
export type StudySessionsResponse = z.infer<typeof StudySessionsResponse>;

export const StudyStatsRoutes = {
  stats: '/users/@me/study-stats', // REQ-STUDY-03/17; 40001
  sessions: '/users/@me/study-sessions', // REQ-STUDY-17; 40001
} as const;

// REQ-STUDY-17 text rules, shared so every screen says it the same way.
export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} phút`;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
};

// "Từ trước tới nay": from 10 hours on, whole hours only.
export const formatAllTime = (minutes: number) =>
  minutes >= 600 ? `${Math.floor(minutes / 60)} giờ` : formatMinutes(minutes);

// History rows: 0 seconds never reach a row; 1–59 seconds read "dưới 1 phút".
export const formatSessionSeconds = (seconds: number) =>
  seconds > 0 && seconds < 60
    ? 'dưới 1 phút'
    : formatMinutes(Math.floor(seconds / 60));

const dayNumber = (isoDate: string) =>
  Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000;

// REQ-STUDY-17 AC2: period total ÷ days elapsed (today included), rounded down.
export const averageMinutesPerDay = (
  totalMinutes: number,
  p: { from: string; to: string; today: string },
) => {
  const last = p.today < p.to ? p.today : p.to;
  const days = dayNumber(last) - dayNumber(p.from) + 1;
  return days > 0 ? Math.floor(totalMinutes / days) : 0;
};
