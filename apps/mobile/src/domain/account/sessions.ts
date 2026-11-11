import type { SessionInfo } from '@nezfocus/shared';
import { localTime } from '../study/stats';

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

const PLATFORM_NAME: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
};

// The system part of a session row (S-ME-03 "Android 13 · Hôm qua 22:15"); sessions from
// before the app sent `os_version` show only the platform.
export function osLabel(s: Pick<SessionInfo, 'platform' | 'os_version'>) {
  const platform = PLATFORM_NAME[s.platform] ?? s.platform;
  return s.os_version ? `${platform} ${s.os_version}` : platform;
}

export const platformLabel = (platform: string) =>
  PLATFORM_NAME[platform] ?? platform;

const DAY_MS = 24 * 60 * 60 * 1000;

// Same three forms as message times (00-components › Giờ ở đầu tin): "20:02",
// "Hôm qua 20:00", "16/10/2026 20:00", in the given time zone.
export function lastActive(
  iso: string,
  now: number,
  timeZone: string,
): LastActive {
  const at = localTime(iso, timeZone);
  const dayOf = (ms: number) =>
    localTime(new Date(ms).toISOString(), timeZone).date;
  if (at.date === dayOf(now)) return { kind: 'today', time: at.time };
  if (at.date === dayOf(now - DAY_MS))
    return { kind: 'yesterday', time: at.time };
  const [y, m, d] = at.date.split('-');
  return { kind: 'date', date: `${d}/${m}/${y}`, time: at.time };
}
