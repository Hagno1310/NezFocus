import {
  DEFAULT_USER_SETTINGS,
  type UpdateSettingsRequest,
} from '@nezfocus/shared';
import type { TFunction } from 'i18next';
import { VolumeX } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { studyNotifications } from '../../../data/notifications';
import { playPhaseAlert } from '../../../data/phaseAlert';
import { appearance, settingsRepository } from '../../../data/settings';
import { saveSettings } from '../../../domain/settings/settings';
import { settingsStore } from '../../../domain/settings/settingsStore';
import { changeTimezone } from '../../../domain/settings/timezone';
import { showToast } from '../../../shared/ui/Toast';
import { useOnline } from '../../gateway/hooks/useOnline';

const clock = () => new Date();

// S-ME-04/05/06: my settings (READY, then my changes and other devices' updates). Before the
// first READY the defaults show and every network control is disabled.
export function useSettings() {
  const settings = useStore(settingsStore, (s) => s.settings);
  const online = useOnline();
  return {
    settings: settings ?? DEFAULT_USER_SETTINGS,
    canSave: online && settings !== null,
  };
}

// Spec 08 `save-error` toast; "Thử lại" sends the same change again.
const showSaveFailed = (t: TFunction, retry: () => void) =>
  showToast({
    message: t('servers.settings.saveFailed'),
    action: { label: t('servers.settings.retry'), onPress: retry },
  });

// Spec 07 › Lưu thay đổi (as 08): a switch saves on touch; a failure puts the old value back.
export function useSaveSetting() {
  const { t } = useTranslation();
  const save = async (change: UpdateSettingsRequest) => {
    if (!(await saveSettings(settingsStore, settingsRepository, change)))
      showSaveFailed(t, () => void save(change));
  };
  return (change: UpdateSettingsRequest) => void save(change);
}

// S-ME-06 theme and language: apply at once, offline too (SRS 3.3 v1.7).
export const changeAppearance = appearance.change;

// S-ME-06 "Đổi múi giờ" in `timezone-confirm`. 40029 (also a change made on another device)
// returns until when, for `timezone-rate-limited`.
export function useChangeTimezone() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const change = async (zone: string): Promise<Date | null> => {
    setSaving(true);
    const r = await changeTimezone(settingsRepository, zone, clock());
    setSaving(false);
    if (r.ok) {
      // Theme and language stay as this phone shows them (they may still be pending).
      const now = settingsStore.getState().settings;
      settingsStore.setState({
        settings: now
          ? { ...r.settings, theme: now.theme, locale: now.locale }
          : r.settings,
      });
      return null;
    }
    if (r.error === 'rate-limited') return r.until;
    showSaveFailed(t, () => void change(zone));
    return null;
  };
  return { change, saving };
}

// S-ME-05 "Nghe thử": the real phase alert; `test-sound-silent` when it would not sound.
export function useTestSound() {
  const { t } = useTranslation();
  return () => {
    if (playPhaseAlert() === 'silenced')
      showToast({ message: t('me.testSoundSilent'), icon: VolumeX });
  };
}

// S-ME-05 "Mở cài đặt" / "Âm thanh và rung": the app's notification page in Android settings.
export const openNotificationSettings = () =>
  void studyNotifications.openAppSettings();
