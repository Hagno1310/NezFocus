const TIMEZONE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// REQ-STUDY-03: one time zone change per 24 hours; the zone picked at Complete account leaves
// changedAt null (AC7). null = a change is allowed now.
// changedAt: the column, or its ISO form in UserSettings.timezone_changed_at.
export function timezoneLockedUntil(
  changedAt: Date | string | null,
  now: Date,
) {
  if (!changedAt) return null;
  const until = new Date(new Date(changedAt).getTime() + TIMEZONE_COOLDOWN_MS);
  return until > now ? until : null;
}
