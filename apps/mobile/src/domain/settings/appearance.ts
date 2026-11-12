import type { UserSettings } from '@nezfocus/shared';
import type { SettingsRepository } from './SettingsRepository';
import type { SettingsStore } from './settingsStore';

export type Appearance = Partial<Pick<UserSettings, 'theme' | 'locale'>>;
// values: what this phone shows; pending: changed here, not yet accepted by the backend.
export type LocalPrefs = { values: Appearance; pending: Appearance };

export interface LocalPrefsStorage {
  load(): Promise<LocalPrefs>;
  save(prefs: LocalPrefs): Promise<void>;
}

const isEmpty = (a: Appearance) => Object.keys(a).length === 0;

// SRS 3.3 (v1.7): theme and language are saved on the phone first, so they apply at once and
// offline; the backend gets them when it can, and a change sent late still wins (no limit).
export function createAppearance(deps: {
  store: SettingsStore;
  repo: Pick<SettingsRepository, 'update'>;
  storage: LocalPrefsStorage;
  apply: (a: Appearance) => void;
}) {
  const { store, repo, storage, apply } = deps;
  let prefs: LocalPrefs = { values: {}, pending: {} };
  let sending = false;

  const keep = (next: LocalPrefs) => {
    prefs = next;
    void storage.save(prefs).catch(() => undefined);
  };

  // Only while signed in (settings known); a failure keeps it pending for the next READY.
  const send = async () => {
    const sent = prefs.pending;
    if (sending || isEmpty(sent) || !store.getState().settings) return;
    sending = true;
    try {
      const s = await repo.update(sent);
      const pending = Object.fromEntries(
        Object.entries(prefs.pending).filter(
          ([k, v]) => sent[k as keyof Appearance] !== v,
        ),
      );
      keep({ ...prefs, pending });
      store.setState({ settings: { ...s, ...prefs.pending } });
    } catch {
      // Offline or refused: stays pending, no error shown.
    } finally {
      sending = false;
    }
  };

  // READY can come before the phone's prefs are read: wait, or a pending change is lost.
  let loading: Promise<void> | null = null;
  const afterLoad = (run: () => void) =>
    loading ? void loading.then(run) : run();

  const fromServer = (s: UserSettings) => {
    const values = { theme: s.theme, locale: s.locale, ...prefs.pending };
    keep({ ...prefs, values });
    apply(values);
    store.setState({ settings: { ...s, ...prefs.pending } });
    void send();
  };

  return {
    load() {
      loading = storage
        .load()
        .then((stored) => {
          prefs = stored;
          if (!isEmpty(prefs.values)) apply(prefs.values);
        })
        .catch(() => undefined)
        .finally(() => (loading = null));
      return loading;
    },

    change(change: Appearance) {
      apply(change);
      const s = store.getState().settings;
      if (s) store.setState({ settings: { ...s, ...change } });
      afterLoad(() => {
        keep({
          values: { ...prefs.values, ...change },
          pending: { ...prefs.pending, ...change },
        });
        void send();
      });
    },

    // READY / USER_SETTINGS_UPDATE: the backend's values, except what is still pending here.
    fromServer: (s: UserSettings) => afterLoad(() => fromServer(s)),
  };
}
