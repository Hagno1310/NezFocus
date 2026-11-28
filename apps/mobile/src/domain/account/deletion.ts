import { ACCOUNT_DELETION_DAYS } from '@nezfocus/shared';

const DAY_MS = 24 * 60 * 60_000;

// 01 S-AUTH-04 `pending-deletion` "vào 01/11/2026 (còn 14 ngày)", S-AUTH-01
// `pending-deletion-notice`, 07 S-ME-03 `delete-confirm`: the day in the user's time zone and
// the whole days left (1 to 14).
export function deletionDay(deletesAt: string, now: number, timeZone: string) {
  const at = Date.parse(deletesAt);
  const date = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(at);
  const days = Math.min(
    ACCOUNT_DELETION_DAYS,
    Math.max(1, Math.ceil((at - now) / DAY_MS)),
  );
  return { date, days };
}
