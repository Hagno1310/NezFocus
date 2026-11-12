const TIMEZONE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// REQ-STUDY-03: one change per 24 hours; the zone picked at Complete account leaves
// changedAt null (AC7). null = a change is allowed now.
export function timezoneLockedUntil(changedAt: Date | null, now: Date) {
  if (!changedAt) return null;
  const until = new Date(changedAt.getTime() + TIMEZONE_COOLDOWN_MS);
  return until > now ? until : null;
}

export type DmSettings = {
  allow: boolean; // allow_dm_from_server_members
  overrides: Record<string, boolean>; // user_server_settings.allow_dm by server id
};

// REQ-DM-02: does this user take DMs from a non-friend they share these servers with?
// The switch off refuses all; otherwise one shared server that still allows is enough.
export const acceptsDmVia = (s: DmSettings, sharedServerIds: string[]) =>
  s.allow && sharedServerIds.some((id) => s.overrides[id] ?? true);
