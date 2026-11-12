import type { SessionInfo } from '@nezfocus/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react-native';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  lastActive,
  osLabel,
  platformLabel,
  splitSessions,
} from '../../../domain/account/sessions';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Skeleton } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { Dialog } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '../hooks/useAccount';

const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
// Spec 07 › Ngắt dòng: the session's second line splits in three on the 360 frame.
const NARROW = 375;
const breakAfterMaker = (name: string) => {
  const [maker, ...model] = name.split(' ');
  return model.length ? `${maker} ${model.join(' ')}` : name;
};

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
  const narrow = useWindowDimensions().width < NARROW;
  const { current, others } = splitSessions(sessions.data ?? []);

  const name = (s: SessionInfo) => s.device_name ?? platformLabel(s.platform);

  // Spec 07 › Ngắt dòng: "Android 13 · Hôm qua 22:15" / "IP 113.190.x.x"; three lines at
  // 360 wide. This device: "Android 14 · Đang hoạt động" in `success`, no IP (frame).
  const lines = (s: SessionInfo) => {
    const os = osLabel(s).replace(/ (?=\d)/g, ' ');
    if (s.current) return [`${os} · ${t('me.active')}`];
    const at = lastActive(s.last_active_at, openedAt, deviceZone);
    const when = (
      at.kind === 'today'
        ? at.time
        : at.kind === 'yesterday'
          ? t('me.yesterday', { time: at.time })
          : `${at.date} ${at.time}`
    ).replace(/ (?=\d)/g, ' ');
    const ip = s.ip_prefix ? [t('me.ip', { ip: s.ip_prefix })] : [];
    return [...(narrow ? [os, when] : [`${os} · ${when}`]), ...ip];
  };

  const row = (s: SessionInfo) => (
    <View key={s.id} style={styles.row}>
      <Icon as={Smartphone} size="xl" color="text-secondary" />
      <View style={styles.rowText}>
        {/* Spec 07 › Ngắt dòng: only after the maker ("Samsung / Galaxy Tab S8"). */}
        <Text variant="headline">{breakAfterMaker(name(s))}</Text>
        {lines(s).map((l) => (
          <Text
            key={l}
            variant="label"
            color={s.current ? 'success' : 'text-secondary'}
          >
            {l}
          </Text>
        ))}
      </View>
      {!s.current && (
        <Button
          variant="secondary"
          tone="danger"
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
            <SectionLabel>{t('me.thisDevice')}</SectionLabel>
            {current && row(current)}
            {others.length === 0 ? (
              <Text variant="label" color="text-secondary">
                {t('me.onlyThisDevice')}
              </Text>
            ) : (
              <>
                <SectionLabel style={styles.section}>
                  {t('me.otherDevices')}
                </SectionLabel>
                {others.map(row)}
                <Button
                  variant="text"
                  tone="danger"
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
    gap: space[2] + space[1],
    paddingVertical: space[2] + space[1],
  },
  rowText: { flex: 1, gap: space[1] / 2 },
});
