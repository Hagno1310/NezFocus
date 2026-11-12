import type { UpdateSettingsRequest } from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { settingsRepository } from '../../../data/settings';
import { saveSettings } from '../../../domain/settings/settings';
import { settingsStore } from '../../../domain/settings/settingsStore';
import { showToast } from '../../../shared/ui/Toast';

export const useSettings = () => useStore(settingsStore, (s) => s.settings);

// Spec 07 › Lưu thay đổi (as 08): a switch saves on touch; `save-error` puts the old value
// back with "Chưa lưu được thay đổi · Thử lại", which sends the same change again.
export function useSaveSetting() {
  const { t } = useTranslation();
  const save = async (change: UpdateSettingsRequest) => {
    if (await saveSettings(settingsStore, settingsRepository, change)) return;
    showToast({
      message: t('servers.settings.saveFailed'),
      action: {
        label: t('servers.settings.retry'),
        onPress: () => void save(change),
      },
    });
  };
  return (change: UpdateSettingsRequest) => void save(change);
}
