import {
  DEFAULT_USER_SETTINGS,
  type UpdateSettingsRequest,
  type UserSettings,
} from '@nezfocus/shared';
import { describe, expect, it, vi } from 'vitest';
import { mergeSettings, revertSettings, saveSettings } from './settings';
import { createSettingsStore } from './settingsStore';

const base: UserSettings = {
  ...DEFAULT_USER_SETTINGS,
  server_allow_dm: { guitar: false },
};

describe('mergeSettings', () => {
  it('a switch changes only its field', () => {
    expect(mergeSettings(base, { show_study_activity: false })).toEqual({
      ...base,
      show_study_activity: false,
    });
  });

  it('a server override joins the others (S-ME-04 per-server row)', () => {
    expect(
      mergeSettings(base, { server_allow_dm: { giaiTich: false } })
        .server_allow_dm,
    ).toEqual({ guitar: false, giaiTich: false });
  });
});

describe('revertSettings (save-error: the old value comes back)', () => {
  it('puts back only what the failed change touched', () => {
    const tried: UpdateSettingsRequest = { show_study_activity: false };
    // Meanwhile another device turned DMs off (USER_SETTINGS_UPDATE).
    const now = {
      ...mergeSettings(base, tried),
      allow_dm_from_server_members: false,
    };
    expect(revertSettings(now, base, tried)).toEqual({
      ...base,
      allow_dm_from_server_members: false,
    });
  });

  it('a new override that failed disappears; an old one gets its value back', () => {
    const tried = { server_allow_dm: { guitar: true, giaiTich: false } };
    expect(
      revertSettings(mergeSettings(base, tried), base, tried).server_allow_dm,
    ).toEqual({ guitar: false });
  });
});

describe('saveSettings', () => {
  it('shows the change at once, then keeps what the backend answered', async () => {
    const store = createSettingsStore(base);
    let answer!: (s: UserSettings) => void;
    const update = vi.fn(
      () => new Promise<UserSettings>((resolve) => (answer = resolve)),
    );
    const done = saveSettings(store, { update }, { hide_push_content: true });
    expect(store.getState().settings?.hide_push_content).toBe(true);
    answer({ ...base, hide_push_content: true });
    expect(await done).toBe(true);
    expect(update).toHaveBeenCalledWith({ hide_push_content: true });
  });

  it('a failed save puts the old value back and says so', async () => {
    const store = createSettingsStore(base);
    const ok = await saveSettings(
      store,
      { update: () => Promise.reject(new Error('offline')) },
      { allow_dm_from_server_members: false },
    );
    expect(ok).toBe(false);
    expect(store.getState().settings).toEqual(base);
  });

  it('no settings yet (before READY): nothing to change, nothing sent', async () => {
    const store = createSettingsStore(null);
    const update = vi.fn();
    expect(
      await saveSettings(store, { update }, { show_study_activity: false }),
    ).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
