import { DEFAULT_USER_SETTINGS } from '@nezfocus/shared';
import { CircleCheck, Play, Volume2, VolumeX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { studyNotifications } from '../../../data/notifications';
import { playPhaseAlert } from '../../../data/phaseAlert';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useNotificationAccess } from '../../study/hooks/useSoloAlerts';
import { useSaveSetting, useSettings } from '../hooks/useSettings';

const openNotificationSettings = () =>
  void studyNotifications.openAppSettings();

// S-ME-05 (REQ-NOTIF-02, SRS 3.3): permission state, two switches, "Nghe thử", and the
// Android notification page of the app. Offline: the switches are disabled; "Nghe thử" and
// "Âm thanh và rung" need no network.
export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const settings = useSettings();
  const s = settings ?? DEFAULT_USER_SETTINGS;
  const save = useSaveSetting();
  // Re-read on return from Android settings (Edge case: allowed there → banner goes).
  const access = useNotificationAccess()?.access;
  const disabled = !online || !settings;

  const testSound = () => {
    if (playPhaseAlert() === 'silenced')
      showToast({ message: t('me.testSoundSilent'), icon: VolumeX });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('me.notifications')} onBack={onBack} />
      <ConnectionBanner />
      {/* `push-denied`: never asks again by itself; "Mở cài đặt" opens the app's page. */}
      {access && access !== 'granted' && (
        <SystemBanner
          kind="push-denied"
          onOpenSettings={openNotificationSettings}
        />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {access === 'granted' && (
          <View style={styles.permission}>
            <Icon as={CircleCheck} size="md" color="success" />
            <Text>{t('me.notificationsOn')}</Text>
          </View>
        )}
        <SettingsRow
          label={t('me.hidePreview')}
          description={t('me.hidePreviewHint')}
          toggle={{
            value: s.hide_push_content,
            onChange: (v) => save({ hide_push_content: v }),
          }}
          disabled={disabled}
        />
        <SettingsRow
          label={t('me.phaseSound')}
          description={t('me.phaseSoundHint')}
          toggle={{
            value: s.focus_sound_always,
            onChange: (v) => save({ focus_sound_always: v }),
          }}
          disabled={disabled}
        />
        <View style={styles.test}>
          <Button
            variant="text"
            size="S"
            icon={Play}
            label={t('me.testSound')}
            onPress={testSound}
          />
        </View>
        <SettingsRow
          label={t('me.soundAndVibration')}
          description={t('me.soundAndVibrationHint')}
          icon={Volume2}
          onPress={openNotificationSettings}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space[3], paddingBottom: space[4] },
  permission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
  },
  test: { alignItems: 'flex-start', paddingVertical: space[2] },
});
