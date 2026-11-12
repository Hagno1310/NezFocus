import * as SecureStore from 'expo-secure-store';
import {
  createAppearance,
  type LocalPrefs,
  type LocalPrefsStorage,
} from '../../domain/settings/appearance';
import { settingsStore } from '../../domain/settings/settingsStore';
import { setLanguage } from '../../shared/i18n';
import { useThemePreference } from '../../shared/theme';
import { pickRepository } from '../fake';
import { fakeSettingsRepository } from './FakeSettingsRepository';
import { remoteSettingsRepository } from './RemoteSettingsRepository';

export const settingsRepository = pickRepository('settings', {
  remote: remoteSettingsRepository,
  fake: fakeSettingsRepository,
});

const PREFS_KEY = 'settings.appearance';

const localPrefs: LocalPrefsStorage = {
  load: async () => {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    return raw ? (JSON.parse(raw) as LocalPrefs) : { values: {}, pending: {} };
  },
  save: (prefs) => SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs)),
};

// S-ME-06 theme and language (SRS 3.3 v1.7): on the phone first, synced when signed in.
export const appearance = createAppearance({
  store: settingsStore,
  repo: settingsRepository,
  storage: localPrefs,
  apply: ({ theme, locale }) => {
    if (theme) useThemePreference.getState().setPreference(theme);
    if (locale) void setLanguage(locale);
  },
});
