import { SettingsRoutes, UserSettings } from '@nezfocus/shared';
import type { SettingsRepository } from '../../domain/settings/SettingsRepository';
import { api } from '../api';

export const remoteSettingsRepository: SettingsRepository = {
  update: async (change) =>
    UserSettings.parse(
      await api.request(SettingsRoutes.settings, {
        method: 'PATCH',
        body: change,
      }),
    ),
};
