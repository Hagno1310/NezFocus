import {
  DoorOpen,
  Info,
  LampDesk,
  Shield,
  SquareCheck,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import type { ChannelSettingsRow } from '../../../domain/servers/serverAccess';
import { space, useTheme } from '../../../shared/theme';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { channelIcon } from '../components/ChannelRow';
import { useChannelAccess } from '../hooks/useChannelAccess';

const TICKETS: Record<
  Exclude<ChannelSettingsRow, 'overview' | 'permissions'>,
  string
> = {
  studyRoom: 'P3-B2 (#27)',
  taskBoard: 'P4-A1 (#32)',
};

const ICONS = {
  overview: Info,
  permissions: Shield,
  studyRoom: LampDesk,
  taskBoard: SquareCheck,
};

// S-SET-06 `text`, `welcome-text`, `voice`, `voice · study-rooms-only`; Edge case
// `long-name-hub` (the name line cuts at one line).
// ponytail: rows still on a placeholder until their ticket — Phòng học (S-SET-07) P3-B2
// #27, Task Board switch (`taskboard-off`) P4-A1 #32.
export function ChannelSettingsScreen({
  serverId,
  channelId,
  onBack,
  onOverview,
  onPermissions,
  onRow,
  onClose,
}: {
  serverId: string;
  channelId: string;
  onBack: () => void;
  onOverview: () => void;
  onPermissions: () => void;
  onRow: (title: string, ticket: string) => void;
  onClose: () => void; // back to the drawer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const access = useChannelAccess(serverId, channelId, 'any', onClose);
  if (!access) return null;
  const { channel, rows, isWelcome } = access;

  const label = (row: ChannelSettingsRow) =>
    row === 'studyRoom'
      ? t('servers.channels.studyRoomRow')
      : t(`servers.channels.${row}`);
  const value = (row: ChannelSettingsRow) =>
    row === 'permissions'
      ? channel.permissions_synced
        ? t('servers.channels.synced')
        : t('servers.channels.custom')
      : row === 'studyRoom'
        ? {
            everyone: t('servers.channels.studyEveryone'),
            managers: t('servers.channels.studyManagers'),
            off: t('servers.channels.studyOff'),
          }[channel.focus_control]
        : undefined;
  const studyRoomsOnly = rows.length === 1 && rows[0] === 'studyRoom';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.channels.settings')} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        <View style={styles.head}>
          <View style={styles.nameRow}>
            <Icon as={channelIcon(channel)} size="lg" color="text-secondary" />
            <Text variant="headline" numberOfLines={1} style={styles.flex}>
              {channel.name}
            </Text>
          </View>
          {isWelcome && (
            <View style={styles.nameRow}>
              <Icon as={DoorOpen} size="sm" color="text-secondary" />
              <Text variant="label" color="text-secondary" style={styles.flex}>
                {t('servers.channels.welcomeLine')}
              </Text>
            </View>
          )}
          {studyRoomsOnly && (
            <Text variant="label" color="text-secondary">
              {t('servers.channels.studyRoomsOnly')}
            </Text>
          )}
        </View>
        {rows.map((row) => (
          <SettingsRow
            key={row}
            icon={ICONS[row]}
            label={label(row)}
            value={value(row)}
            description={
              row === 'taskBoard'
                ? t('servers.channels.taskBoardHint')
                : undefined
            }
            onPress={() =>
              row === 'overview'
                ? onOverview()
                : row === 'permissions'
                  ? onPermissions()
                  : onRow(label(row), TICKETS[row])
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space[3] },
  head: { paddingVertical: space[3], gap: space[1] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
