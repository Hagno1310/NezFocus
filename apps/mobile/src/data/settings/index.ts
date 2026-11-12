import {
  AccountRoutes,
  DEFAULT_USER_SETTINGS,
  UserSettings,
} from '@nezfocus/shared';
import type { SettingsRepository } from '../../domain/settings/SettingsRepository';
import { mergeSettings } from '../../domain/settings/settings';
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
