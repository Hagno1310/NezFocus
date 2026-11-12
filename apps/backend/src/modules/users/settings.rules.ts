export type DmSettings = {
  allow: boolean; // allow_dm_from_server_members
  overrides: Record<string, boolean>; // user_server_settings.allow_dm by server id
};

// REQ-DM-02: does this user take DMs from a non-friend they share these servers with?
// The switch off refuses all; otherwise one shared server that still allows is enough.
export const acceptsDmVia = (s: DmSettings, sharedServerIds: string[]) =>
  s.allow && sharedServerIds.some((id) => s.overrides[id] ?? true);
