import {
  ErrorCode,
  timezoneLockedUntil,
  type UserSettings,
} from '@nezfocus/shared';
import { gmtLabel, zoneOffsetMinutes } from '../auth/timeZones';
import { asApiError } from '../auth/authFlow';
import type { SettingsRepository } from './SettingsRepository';

// REQ-STUDY-03: until when the time zone cannot change. From the settings (a change made here
// or elsewhere), or from a 40029 seen here before the other device's update arrived.
export function timezoneLock(
  s: UserSettings,
  refusedUntil: Date | null,
  now: Date,
): Date | null {
  const changedAt = s.timezone_changed_at
    ? new Date(s.timezone_changed_at)
    : null;
  const fromSettings = timezoneLockedUntil(changedAt, now);
  const fromRefusal = refusedUntil && refusedUntil > now ? refusedUntil : null;
  if (!fromSettings) return fromRefusal;
  if (!fromRefusal) return fromSettings;
  return fromSettings > fromRefusal ? fromSettings : fromRefusal;
}

// "Đổi lại được sau 22:12 ngày 19/10 (GMT+9)": in the account's (new) zone, with its code so
// it is not read as the phone's clock.
export function lockedNote(until: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(until);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    time: `${get('hour')}:${get('minute')}`,
    date: `${get('day')}/${get('month')}`,
    zone: gmtLabel(zoneOffsetMinutes(timeZone, until)),
  };
}

export type ChangeTimezoneResult =
  | { ok: true; settings: UserSettings }
  | { ok: false; error: 'rate-limited'; until: Date }
  | { ok: false; error: 'failed' };

// S-ME-06 "Đổi múi giờ" in `timezone-confirm`.
export async function changeTimezone(
  repo: Pick<SettingsRepository, 'update'>,
  timezone: string,
  now: Date,
): Promise<ChangeTimezoneResult> {
  try {
    return { ok: true, settings: await repo.update({ timezone }) };
  } catch (err) {
    const api = asApiError(err);
    if (api?.code === ErrorCode.RateLimited)
      return {
        ok: false,
        error: 'rate-limited',
        until: new Date(now.getTime() + (api.retry_after ?? 0) * 1000),
      };
    return { ok: false, error: 'failed' };
  }
}
