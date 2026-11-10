import { DAILY_FOCUS_CAP_SECONDS } from '@nezfocus/shared';

// Caller contract: backend-clock focus time only, disjoint and not credited before; pass phaseEndsAt for AC3/AC4.
export type FocusInterval = {
  start: Date;
  end: Date;
  phaseEndsAt?: Date | null;
};
// capped: the 16 h cap dropped some of this day's seconds (S-STUDY-EDGE long-session).
export type DayCredit = { localDate: string; seconds: number; capped: boolean };

const formatters = new Map<string, Intl.DateTimeFormat>();
// en-CA formats as YYYY-MM-DD, the shape of a Postgres DATE.
export function localDate(t: number, timezone: string) {
  let f = formatters.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
    formatters.set(timezone, f);
  }
  return f.format(t);
}

// Binary search for the next local date, so DST and zones without a 00:00 need no special case.
function nextLocalDayStart(t: number, timezone: string) {
  const today = localDate(t, timezone);
  let lo = t;
  let hi = t + 26 * 3600_000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (localDate(mid, timezone) === today) lo = mid;
    else hi = mid;
  }
  return hi;
}

export function creditFocus(
  intervals: FocusInterval[],
  timezone: string,
  alreadyByDate: Record<string, number>,
): DayCredit[] {
  const msByDate = new Map<string, number>();
  for (const interval of intervals) {
    // AC3/AC4: never past the phase schedule, however late the stop arrives.
    const end = Math.min(
      interval.end.getTime(),
      interval.phaseEndsAt?.getTime() ?? Infinity,
    );
    // STUDY-03 AC3: the part before local 00:00 belongs to the old day.
    for (let t = interval.start.getTime(); t < end;) {
      const date = localDate(t, timezone);
      const pieceEnd = Math.min(end, nextLocalDayStart(t, timezone));
      msByDate.set(date, (msByDate.get(date) ?? 0) + pieceEnd - t);
      t = pieceEnd;
    }
  }
  return [...msByDate]
    .map(([date, ms]) => {
      const raw = Math.floor(ms / 1000);
      const room = Math.max(
        0,
        DAILY_FOCUS_CAP_SECONDS - (alreadyByDate[date] ?? 0),
      );
      return {
        localDate: date,
        seconds: Math.min(raw, room),
        capped: raw > room,
      };
    })
    .filter((c) => c.seconds > 0 || c.capped);
}
