import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Mail, Smartphone, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space, useTheme } from '../../../shared/theme';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { showErrorToast } from '../../auth/hooks/useAuthActions';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import {
  DeleteAccountSheets,
  firstDeleteStep,
  type DeleteStep,
} from '../components/DeleteAccountSheets';
import { useSessions } from '../hooks/useAccount';
import { useMe } from '../hooks/useMe';

// S-ME-03 `default`, `delete-blocked-owner`, `delete-confirm`. Offline: every row but Email
// is disabled.
export function AccountScreen({
  onBack,
  onChangePassword,
  onSessions,
  onOpenServer,
  onForgot,
}: {
  onBack: () => void;
  onChangePassword: () => void;
  onSessions: () => void;
  onOpenServer: (serverId: string) => void; // 08 S-SET-08 of a server that blocks
  onForgot: () => void; // S-ME-03 `password-code` from the delete sheet
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [step, setStep] = useState<DeleteStep>(null);
  const [opening, setOpening] = useState(false);
  const startDelete = async () => {
    setOpening(true);
    try {
      setStep(await firstDeleteStep(qc));
    } catch {
      showErrorToast('network');
    } finally {
      setOpening(false);
    }
  };
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
          disabled={!online || opening}
          onPress={() => void startDelete()}
        />
        <Text variant="label" color="text-secondary">
          {t('me.deleteNote')}
        </Text>
      </ScrollView>
      <DeleteAccountSheets
        step={step}
        onStep={setStep}
        onOpenServer={onOpenServer}
        onForgot={onForgot}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space[3], paddingBottom: space[4] },
  section: { paddingTop: space[4], paddingBottom: space[1] },
});
