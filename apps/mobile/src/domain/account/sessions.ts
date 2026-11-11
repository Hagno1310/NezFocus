import type { SessionInfo } from '@nezfocus/shared';

// S-ME-03 `sessions`: "THIẾT BỊ NÀY" apart from "THIẾT BỊ KHÁC" (backend order kept).
export function splitSessions(list: SessionInfo[]) {
  return {
    current: list.find((s) => s.current) ?? null,
    others: list.filter((s) => !s.current),
  };
}

export type LastActive =
  | { kind: 'today'; time: string }
  | { kind: 'yesterday'; time: string }
  | { kind: 'date'; date: string; time: string };

// The device name a session shows (CR-28 #10 `device.name`, ≤ 100): maker + model as Android
// reports them, without repeating a maker the model already starts with.
export function deviceLabel(
  maker: string | undefined,
  model: string | undefined,
): string | undefined {
  const m = model?.trim();
  if (!m) return undefined;
  const b = maker?.trim();
  const name =
    !b || m.toLowerCase().startsWith(b.toLowerCase())
      ? m
      : `${b[0]!.toUpperCase()}${b.slice(1)} ${m}`;
  return name.slice(0, 100);
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function wall(ms: number, timeZone: string) {
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
    f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    date: `${p.day}/${p.month}/${p.year}`,
    time: `${p.hour}:${p.minute}`,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Same three forms as message times (00-components › Giờ ở đầu tin): "20:02",
// "Hôm qua 20:00", "16/10/2026 20:00", in the given time zone.
export function lastActive(
  iso: string,
  now: number,
  timeZone: string,
): LastActive {
  const at = wall(Date.parse(iso), timeZone);
  if (at.day === wall(now, timeZone).day)
    return { kind: 'today', time: at.time };
  if (at.day === wall(now - DAY_MS, timeZone).day)
    return { kind: 'yesterday', time: at.time };
  return { kind: 'date', date: at.date, time: at.time };
}
