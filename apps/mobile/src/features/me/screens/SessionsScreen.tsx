import type { SessionInfo } from '@nezfocus/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { lastActive, splitSessions } from '../../../domain/account/sessions';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Skeleton } from '../../../shared/ui/Feedback';
import { Dialog } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '../hooks/useAccount';

const platformName: Record<string, string> = { android: 'Android', ios: 'iOS' };
const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

// S-ME-03 `sessions` / `sessions-single` (AUTH-07). Revoking one asks first
// (`revoke-confirm`); that device lands on S-AUTH-04 `session-revoked-here`.
export function SessionsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const [asking, setAsking] = useState<SessionInfo | null>(null);
  const [openedAt] = useState(Date.now);
  const { current, others } = splitSessions(sessions.data ?? []);

  const name = (s: SessionInfo) =>
    s.device_name ?? platformName[s.platform] ?? s.platform;

  // "Android · Hôm qua 22:15" / "IP 113.190.x.x": two lines, the name and time never split.
  // ponytail: no OS version in SessionInfo yet ("Android 13" in spec 07); see the #9 report.
  const lines = (s: SessionInfo) => {
    const at = lastActive(s.last_active_at, openedAt, deviceZone);
    const when = s.current
      ? t('me.active')
      : at.kind === 'today'
        ? at.time
        : at.kind === 'yesterday'
          ? t('me.yesterday', { time: at.time })
          : `${at.date} ${at.time}`;
    const first = [platformName[s.platform] ?? s.platform, when]
      .join(' · ')
      .replace(/ (?=\d)/g, ' ');
    return s.ip_prefix ? [first, t('me.ip', { ip: s.ip_prefix })] : [first];
  };

  const row = (s: SessionInfo) => (
    <View key={s.id} style={styles.row}>
      <View style={styles.rowText}>
        {/* Spec 07 › Ngắt dòng: the device name never splits. */}
        <Text variant="headline">{name(s).replace(/ /g, ' ')}</Text>
        {lines(s).map((l) => (
          <Text key={l} variant="label" color="text-secondary">
            {l}
          </Text>
        ))}
      </View>
      {!s.current && (
        <Button
          variant="danger"
          size="S"
          label={t('me.revoke')}
          disabled={!online || revokeOthers.pending}
          onPress={() => setAsking(s)}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('me.sessions')} onBack={onBack} />
      <ConnectionBanner />
      <ScrollView contentContainerStyle={styles.content}>
        {sessions.isPending ? (
          <Skeleton width="100%" height={size.settingsRow} />
        ) : (
          <>
            <Text variant="label" color="text-secondary">
              {t('me.thisDevice')}
            </Text>
            {current && row(current)}
            {others.length === 0 ? (
              <Text color="text-secondary">{t('me.onlyThisDevice')}</Text>
            ) : (
              <>
                <Text
                  variant="label"
                  color="text-secondary"
                  style={styles.section}
                >
                  {t('me.otherDevices')}
                </Text>
                {others.map(row)}
                <Button
                  variant="danger"
                  size="L"
                  fullWidth
                  label={t('me.revokeOthers')}
                  loading={revokeOthers.pending}
                  disabled={!online}
                  onPress={() => void revokeOthers.run()}
                />
              </>
            )}
          </>
        )}
      </ScrollView>

      <Dialog
        visible={!!asking}
        title={
          asking
            ? t('me.revokeTitle', {
                device: name(asking).replace(/ /g, ' '),
              })
            : ''
        }
        body={t('me.revokeBody')}
        cancel={{ label: t('me.cancel'), onPress: () => setAsking(null) }}
        confirm={{
          label: t('me.revoke'),
          variant: 'danger',
          loading: revoke.pending,
          onPress: () => {
            const target = asking;
            if (!target) return;
            void revoke.run(target.id).then(() => setAsking(null));
          },
        }}
        onDismiss={() => setAsking(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[3], gap: space[2] },
  section: { paddingTop: space[3] },
  row: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2],
  },
  rowText: { flex: 1, gap: space[1] / 2 },
});
