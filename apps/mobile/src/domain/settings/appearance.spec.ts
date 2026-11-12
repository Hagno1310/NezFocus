import { DEFAULT_USER_SETTINGS, type UserSettings } from '@nezfocus/shared';
import { describe, expect, it, vi } from 'vitest';
import { createAppearance, type LocalPrefs } from './appearance';
import { createSettingsStore } from './settingsStore';

const setup = (opts: {
  stored?: LocalPrefs;
  settings?: UserSettings | null;
  update?: (c: object) => Promise<UserSettings>;
}) => {
  let saved: LocalPrefs | undefined;
  const store = createSettingsStore(opts.settings ?? null);
  const apply = vi.fn();
  const update = vi.fn(
    opts.update ??
      (async (c: object) => ({ ...store.getState().settings!, ...c })),
  );
  const appearance = createAppearance({
    store,
    repo: { update },
    storage: {
      load: async () => opts.stored ?? { values: {}, pending: {} },
      save: async (p) => void (saved = p),
    },
    apply,
  });
  return { appearance, store, apply, update, saved: () => saved };
};

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('appearance (SRS 3.3 v1.7: theme and language apply even offline)', () => {
  it('on start, the last theme / language of this phone apply before any network', async () => {
    const t = setup({
      stored: { values: { theme: 'light', locale: 'en' }, pending: {} },
    });
    await t.appearance.load();
    expect(t.apply).toHaveBeenCalledWith({ theme: 'light', locale: 'en' });
  });

  it('a change applies at once, is kept on the phone, and is sent', async () => {
    const t = setup({ settings: DEFAULT_USER_SETTINGS });
    t.appearance.change({ theme: 'dark' });
    expect(t.apply).toHaveBeenCalledWith({ theme: 'dark' });
    expect(t.store.getState().settings?.theme).toBe('dark');
    await flush();
    expect(t.update).toHaveBeenCalledWith({ theme: 'dark' });
    expect(t.saved()).toEqual({ values: { theme: 'dark' }, pending: {} });
  });

  it('offline: the change stays, no error; the next READY sends it and it wins', async () => {
    const t = setup({
      settings: DEFAULT_USER_SETTINGS,
      update: () => Promise.reject(new Error('offline')),
    });
    t.appearance.change({ locale: 'en' });
    await flush();
    expect(t.store.getState().settings?.locale).toBe('en');
    expect(t.saved()?.pending).toEqual({ locale: 'en' });

    t.update.mockImplementation(async (c) => ({
      ...DEFAULT_USER_SETTINGS,
      ...c,
    }));
    t.appearance.fromServer(DEFAULT_USER_SETTINGS); // READY still says vi
    expect(t.store.getState().settings?.locale).toBe('en');
    await flush();
    expect(t.update).toHaveBeenLastCalledWith({ locale: 'en' });
    expect(t.saved()?.pending).toEqual({});
  });

  it("another device's change (USER_SETTINGS_UPDATE) applies here when nothing is pending", async () => {
    const t = setup({ settings: DEFAULT_USER_SETTINGS });
    t.appearance.fromServer({
      ...DEFAULT_USER_SETTINGS,
      theme: 'light',
      locale: 'en',
    });
    expect(t.apply).toHaveBeenLastCalledWith({ theme: 'light', locale: 'en' });
    expect(t.saved()).toEqual({
      values: { theme: 'light', locale: 'en' },
      pending: {},
    });
    expect(t.update).not.toHaveBeenCalled();
  });

  it('signed out (no settings): the change is kept on the phone, nothing is sent', async () => {
    const t = setup({ settings: null });
    t.appearance.change({ theme: 'light' });
    await flush();
    expect(t.update).not.toHaveBeenCalled();
    expect(t.saved()?.pending).toEqual({ theme: 'light' });
  });
});

describe('appearance start-up race', () => {
  it('READY before the stored prefs are read: the pending language still wins and is sent', async () => {
    const t = setup({
      settings: DEFAULT_USER_SETTINGS,
      stored: { values: { locale: 'en' }, pending: { locale: 'en' } },
    });
    const loaded = t.appearance.load();
    t.appearance.fromServer(DEFAULT_USER_SETTINGS);
    await loaded;
    await flush();
    expect(t.store.getState().settings?.locale).toBe('en');
    expect(t.update).toHaveBeenCalledWith({ locale: 'en' });
  });
});

describe('appearance, back-to-back changes and sign-out', () => {
  it('a second change made while the first is being sent is sent right after', async () => {
    let release!: () => void;
    const t = setup({
      settings: DEFAULT_USER_SETTINGS,
      update: (c) =>
        new Promise((resolve) => {
          release = () => resolve({ ...DEFAULT_USER_SETTINGS, ...c });
        }),
    });
    t.appearance.change({ theme: 'dark' });
    t.appearance.change({ locale: 'en' });
    release();
    await flush();
    release();
    await flush();
    expect(t.update).toHaveBeenCalledTimes(2);
    expect(t.update).toHaveBeenLastCalledWith({ locale: 'en' });
    expect(t.saved()?.pending).toEqual({});
  });

  it("sign-out drops the unsent change; the next account's READY is not overridden", async () => {
    const t = setup({
      settings: DEFAULT_USER_SETTINGS,
      update: () => Promise.reject(new Error('offline')),
    });
    t.appearance.change({ locale: 'en' });
    await flush();
    t.appearance.signedOut();
    t.update.mockImplementation(async (c) => ({
      ...DEFAULT_USER_SETTINGS,
      ...c,
    }));
    t.appearance.fromServer(DEFAULT_USER_SETTINGS);
    await flush();
    expect(t.store.getState().settings?.locale).toBe('vi');
    expect(t.update).toHaveBeenCalledTimes(1);
  });
});
