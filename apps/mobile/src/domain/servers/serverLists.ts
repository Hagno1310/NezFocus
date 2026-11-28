import {
  SERVER_RESTORE_DAYS,
  type DeletedServer,
  type InviteResponse,
  type ServerBan,
} from '@nezfocus/shared';
import { localTime } from '../study/stats';

// S-SET-04 `invites`: "3/10 lượt"; an unlimited invite counts its uses only ("5 lượt").
export const inviteUses = (i: Pick<InviteResponse, 'uses' | 'max_uses'>) => ({
  uses: i.uses,
  max: i.max_uses || null,
});

const HOUR = 3600_000;
const DAY = 24 * HOUR;

// "hết hạn sau 23 giờ" / "hết hạn sau 6 ngày", whole units left, at least 1 minute; null: never.
export function inviteExpiry(expiresAt: string | null, now: number) {
  if (!expiresAt) return null;
  const left = Date.parse(expiresAt) - now;
  if (left >= DAY) return { unit: 'day' as const, n: Math.floor(left / DAY) };
  if (left >= HOUR)
    return { unit: 'hour' as const, n: Math.floor(left / HOUR) };
  return { unit: 'minute' as const, n: Math.max(1, Math.floor(left / 60_000)) };
}

const dayMonthYear = (iso: string, timeZone: string) => {
  const [y, m, d] = localTime(iso, timeZone).date.split('-');
  return { d: d!, m: m!, y: y! };
};
const shownName = (u: {
  display_name: string | null;
  username: string | null;
}) => u.display_name ?? u.username ?? '';

// `bans` row: "Spam link cá cược · 15/10 · bởi An" (the banner's display name, CR-17 #13).
export function banRowLine(b: ServerBan, timeZone: string) {
  const { d, m } = dayMonthYear(b.created_at, timeZone);
  return {
    reason: b.reason,
    date: `${d}/${m}`,
    by: b.banned_by ? shownName(b.banned_by) : null,
  };
}

// `ban-detail`: "Cấm ngày 15/10/2026 bởi An (an.nguyen)".
export function banDetailLine(b: ServerBan, timeZone: string) {
  const { d, m, y } = dayMonthYear(b.created_at, timeZone);
  return {
    date: `${d}/${m}/${y}`,
    by: b.banned_by ? shownName(b.banned_by) : null,
    username: b.banned_by?.username ?? null,
  };
}

// Spec 08 S-SET-04: the search field only when more than 10 people are banned.
export const BAN_SEARCH_FROM = 11;

const DAY_MS = 24 * 60 * 60_000;

// 02 S-HOME-06 `restore-list` "Còn 30 ngày để khôi phục": whole days left, 1 to 30.
export const daysLeft = (
  s: Pick<DeletedServer, 'restore_until'>,
  now: number,
) =>
  Math.min(
    SERVER_RESTORE_DAYS,
    Math.max(1, Math.ceil((Date.parse(s.restore_until) - now) / DAY_MS)),
  );
