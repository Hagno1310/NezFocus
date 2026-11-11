import { KeyRound, Mail, Smartphone, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space, useTheme } from '../../../shared/theme';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useSessions } from '../hooks/useAccount';
import { useMe } from '../hooks/useMe';

// S-ME-03 `default`. Offline: every row but Email is disabled.
export function AccountScreen({
  onBack,
  onChangePassword,
  onSessions,
  onDeleteAccount,
}: {
  onBack: () => void;
  onChangePassword: () => void;
  onSessions: () => void;
  onDeleteAccount: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const me = useMe().data;
  const sessions = useSessions().data;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('me.account')} onBack={onBack} />
      <ConnectionBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsRow
          label={t('me.email')}
          icon={Mail}
          value={me?.email ?? ''}
          chevron={false}
        />
        <SettingsRow
          label={t('me.changePassword')}
          icon={KeyRound}
          disabled={!online}
          onPress={onChangePassword}
        />
        <SettingsRow
          label={t('me.sessions')}
          icon={Smartphone}
          value={
            sessions ? t('me.devices', { count: sessions.length }) : undefined
          }
          disabled={!online}
          onPress={onSessions}
        />
        <SectionLabel style={styles.section}>{t('me.dangerZone')}</SectionLabel>
        <SettingsRow
          label={t('me.deleteAccount')}
          icon={Trash2}
          danger
          disabled={!online}
          onPress={onDeleteAccount}
        />
        <Text variant="label" color="text-secondary">
          {t('me.deleteNote')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space[3], paddingBottom: space[4] },
  section: { paddingTop: space[4], paddingBottom: space[1] },
});
