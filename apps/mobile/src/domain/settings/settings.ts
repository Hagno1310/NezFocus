import type { UpdateSettingsRequest, UserSettings } from '@nezfocus/shared';
import type { SettingsRepository } from './SettingsRepository';
import type { SettingsStore } from './settingsStore';

// A change on top of the settings; per-server DM overrides join the existing ones.
export function mergeSettings(
  s: UserSettings,
  change: UpdateSettingsRequest,
): UserSettings {
  const { server_allow_dm, ...rest } = change;
  const defined = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  );
  return {
    ...s,
    ...defined,
    server_allow_dm: { ...s.server_allow_dm, ...server_allow_dm },
  };
}

// Spec 08 `save-error`: only what the failed change touched goes back to its old value;
// anything another device changed meanwhile stays.
export function revertSettings(
  now: UserSettings,
  before: UserSettings,
  change: UpdateSettingsRequest,
): UserSettings {
  const { server_allow_dm, ...rest } = change;
  const back: Record<string, unknown> = { ...now };
  for (const key of Object.keys(rest) as (keyof typeof rest)[])
    if (rest[key] !== undefined) back[key] = before[key];
  const overrides = { ...now.server_allow_dm };
  for (const id of Object.keys(server_allow_dm ?? {})) {
    if (id in before.server_allow_dm)
      overrides[id] = before.server_allow_dm[id]!;
    else delete overrides[id];
  }
  return { ...(back as UserSettings), server_allow_dm: overrides };
}

// Spec 07 › Lưu thay đổi: a switch saves on touch. The change shows at once; a failed save
// puts the old value back and returns false (the screen offers "Thử lại").
export async function saveSettings(
  store: SettingsStore,
  repo: Pick<SettingsRepository, 'update'>,
  change: UpdateSettingsRequest,
): Promise<boolean> {
  const before = store.getState().settings;
  if (!before) return false;
  store.setState({ settings: mergeSettings(before, change) });
  try {
    store.setState({ settings: await repo.update(change) });
    return true;
  } catch {
    const now = store.getState().settings ?? before;
    store.setState({ settings: revertSettings(now, before, change) });
    return false;
  }
}
