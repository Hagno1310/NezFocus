import { DEFAULT_USER_SETTINGS } from '@nezfocus/shared';
import { Ban, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { homeStore } from '../../../domain/servers/homeStore';
import { space, useTheme } from '../../../shared/theme';
import { NoteLine } from '../../../shared/ui/NoteLine';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useSaveSetting, useSettings } from '../hooks/useSettings';

// S-ME-04: who may DM me (REQ-DM-02, per server), "Hiện hoạt động học" (AUTH-05, CR-24), the
// block list. Every switch saves on touch; offline (or before READY) every control is disabled.
export function PrivacyScreen({
  onBack,
  onOpenBlocked,
}: {
  onBack: () => void;
  onOpenBlocked: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const settings = useSettings();
  const s = settings ?? DEFAULT_USER_SETTINGS;
  // The rail's order: oldest joined first (READY).
  const servers = useStore(homeStore, (h) => h.servers) ?? [];
  const save = useSaveSetting();
  const disabled = !online || !settings;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('me.privacy')} onBack={onBack} />
      <ConnectionBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel style={styles.first}>{t('me.dmSection')}</SectionLabel>
        <SettingsRow
          label={t('me.dmFromMembers')}
          description={t('me.dmFromMembersHint')}
          toggle={{
            value: s.allow_dm_from_server_members,
            onChange: (v) => save({ allow_dm_from_server_members: v }),
          }}
          disabled={disabled}
        />
        {s.allow_dm_from_server_members ? (
          servers.length > 0 && (
            <>
              <SectionLabel style={styles.section}>
                {t('me.perServer')}
              </SectionLabel>
              <Text variant="label" color="text-secondary">
                {t('me.perServerHint')}
              </Text>
              {servers.map((server) => (
                <SettingsRow
                  key={server.id}
                  label={server.name}
                  toggle={{
                    value: s.server_allow_dm[server.id] ?? true,
                    onChange: (v) =>
                      save({ server_allow_dm: { [server.id]: v } }),
                  }}
                  disabled={disabled}
                />
              ))}
            </>
          )
        ) : (
          // `dm-off`: the per-server group hides; its overrides stay for when it comes back.
          <NoteLine icon={Info} text={t('me.friendsOnly')} />
        )}
        <SectionLabel style={styles.section}>
          {t('me.activitySection')}
        </SectionLabel>
        <SettingsRow
          label={t('me.showActivity')}
          description={t(
            s.show_study_activity ? 'me.showActivityOn' : 'me.showActivityOff',
          )}
          toggle={{
            value: s.show_study_activity,
            onChange: (v) => save({ show_study_activity: v }),
          }}
          disabled={disabled}
        />
        <SectionLabel style={styles.section}>
          {t('me.blockSection')}
        </SectionLabel>
        {/* ponytail: no count and a placeholder until the Friends screen, P2-B2.3 (#112),
            opens its "Đã chặn" tab here with the number of blocked people. */}
        <SettingsRow
          label={t('me.blocked')}
          icon={Ban}
          onPress={onOpenBlocked}
          disabled={!online}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space[3], paddingBottom: space[4] },
  first: { paddingTop: space[3], paddingBottom: space[1] },
  section: { paddingTop: space[4], paddingBottom: space[1] },
});
