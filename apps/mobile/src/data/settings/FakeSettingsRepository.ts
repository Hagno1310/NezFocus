import { DEFAULT_USER_SETTINGS } from '@nezfocus/shared';
import type { SettingsRepository } from '../../domain/settings/SettingsRepository';
import { mergeSettings } from '../../domain/settings/settings';

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

export const fakeSettingsRepository = createFakeSettingsRepository();
