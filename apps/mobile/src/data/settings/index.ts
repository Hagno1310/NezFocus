import {
  AccountRoutes,
  DEFAULT_USER_SETTINGS,
  UserSettings,
} from '@nezfocus/shared';
import * as SecureStore from 'expo-secure-store';
import type { SettingsRepository } from '../../domain/settings/SettingsRepository';
import {
  createAppearance,
  type LocalPrefs,
  type LocalPrefsStorage,
} from '../../domain/settings/appearance';
import { mergeSettings } from '../../domain/settings/settings';
import { settingsStore } from '../../domain/settings/settingsStore';
import { setLanguage } from '../../shared/i18n';
import { useThemePreference } from '../../shared/theme';
import { api } from '../api';
import { pickRepository } from '../fake';

const remote: SettingsRepository = {
  update: async (change) =>
    UserSettings.parse(
      await api.request(AccountRoutes.settings, {
        method: 'PATCH',
        body: change,
      }),
    ),
};

// EXPO_PUBLIC_FAKE=settings (WORKFLOW 4.2): saves in memory, as the backend would answer.
export function createFakeSettingsRepository(
  delayMs = 300,
): SettingsRepository {
  let settings = DEFAULT_USER_SETTINGS;
  return {
    update: async (change) => {
      await new Promise((r) => setTimeout(r, delayMs));
      settings = mergeSettings(settings, change);
      return settings;
    },
  };
}

export const settingsRepository = pickRepository('settings', {
  remote,
  fake: createFakeSettingsRepository(),
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
