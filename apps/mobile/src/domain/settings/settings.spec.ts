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

describe('saveSettings, two quick taps', () => {
  const deferred = () => {
    let resolve!: (s: UserSettings) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<UserSettings>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('the first answer does not flip back a second switch still being sent', async () => {
    const store = createSettingsStore(base);
    const first = deferred();
    const second = deferred();
    const calls = [first, second];
    const repo = { update: () => calls.shift()!.promise };
    const a = saveSettings(store, repo, { hide_push_content: true });
    const b = saveSettings(store, repo, { focus_sound_always: true });
    first.resolve({ ...base, hide_push_content: true });
    await a;
    expect(store.getState().settings?.focus_sound_always).toBe(true);
    second.resolve({
      ...base,
      hide_push_content: true,
      focus_sound_always: true,
    });
    await b;
    expect(store.getState().settings).toMatchObject({
      hide_push_content: true,
      focus_sound_always: true,
    });
  });

  it('a failed first save does not undo a later change of the same switch', async () => {
    const store = createSettingsStore(base);
    const first = deferred();
    const second = deferred();
    const calls = [first, second];
    const repo = { update: () => calls.shift()!.promise };
    const a = saveSettings(store, repo, { show_study_activity: false });
    const b = saveSettings(store, repo, { show_study_activity: true });
    first.reject(new Error('offline'));
    expect(await a).toBe(false);
    expect(store.getState().settings?.show_study_activity).toBe(true);
    second.resolve(base);
    await b;
  });

  it('keeps the theme / language this phone shows (owned by appearance)', async () => {
    const store = createSettingsStore({ ...base, theme: 'light' });
    await saveSettings(
      store,
      { update: async () => ({ ...base, hide_push_content: true }) },
      { hide_push_content: true },
    );
    expect(store.getState().settings?.theme).toBe('light');
  });
});
