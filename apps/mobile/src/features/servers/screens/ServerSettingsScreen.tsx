import {
  Ban,
  Crown,
  Flag,
  Info,
  Link,
  Shield,
  Trash2,
  Users,
} from 'lucide-react-native';
import { useEffect, useEffectEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import type { SettingsRow as Row } from '../../../domain/servers/serverAccess';
import { disabledOpacity, size, space, useTheme } from '../../../shared/theme';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { ServerIcon } from '../components/ServerIcon';
import { useServerAccess } from '../hooks/useServerAccess';

const ICONS = {
  overview: Info,
  roles: Shield,
  members: Users,
  invites: Link,
  bans: Ban,
  reports: Flag,
  transfer: Crown,
};

// S-SET-01 `owner` / `offline`. Rows follow permission (Q17); every row but Tổng quan opens a
// placeholder until its ticket (Vai trò P1-A3.5 #68, Thành viên P2-A2 #15, Lời mời /
// Danh sách cấm P3-A3 #23, Báo cáo P3-A5 #25, Chuyển quyền / Xóa server P3-A4 #24).
export function ServerSettingsScreen({
  serverId,
  onBack,
  onOverview,
  onRow,
  onLostAccess,
}: {
  serverId: string;
  onBack: () => void;
  onOverview: () => void;
  onRow: (title: string) => void;
  onLostAccess: () => void; // back to the drawer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const access = useServerAccess(serverId);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const rows = access?.settingsRows ?? [];

  // Spec 08 › Edge case: losing every management permission closes the screen. Roles are
  // refetched after a reconnect; wait for them instead of closing on the gap.
  const lost = !access || (access.roles !== undefined && rows.length === 0);
  const close = useEffectEvent(() => {
    showToast({ message: t('servers.settings.lostAccess') });
    onLostAccess();
  });
  useEffect(() => {
    if (lost) close();
  }, [lost]);
  if (!access) return null;
  const { server, roles } = access;

  const value = (row: Row) =>
    row === 'roles'
      ? roles && String(roles.length)
      : row === 'members'
        ? String(server.member_count)
        : undefined;
  const label = (row: Row) => t(`servers.settings.${row}`);
  const managed = rows.filter((r) => r !== 'transfer' && r !== 'delete');

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.settings.title')} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        <View style={styles.head}>
          <ServerIcon server={server} size={48} />
          <View style={styles.flex}>
            <Text variant="headline" numberOfLines={1}>
              {server.name}
            </Text>
            <Text variant="label" color="text-secondary" numberOfLines={1}>
              {server.template === 'study_server'
                ? t('servers.drawer.subtitleStudy', {
                    count: server.member_count,
                  })
                : t('servers.drawer.subtitle', { count: server.member_count })}
            </Text>
          </View>
        </View>
        {managed.map((row) => (
          <SettingsRow
            key={row}
            icon={ICONS[row]}
            label={label(row)}
            value={value(row)}
            onPress={() =>
              row === 'overview' ? onOverview() : onRow(label(row))
            }
          />
        ))}
        {access.isOwner && (
          <>
            <Text
              variant="label"
              weight="600"
              color="text-tertiary"
              style={styles.group}
            >
              {t('servers.settings.ownerOnly')}
            </Text>
            <SettingsRow
              icon={Crown}
              label={label('transfer')}
              onPress={() => onRow(label('transfer'))}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label('delete')}
              accessibilityState={{ disabled: offline }}
              disabled={offline}
              onPress={() => onRow(label('delete'))}
              style={[styles.danger, offline && { opacity: disabledOpacity }]}
            >
              <Icon as={Trash2} size="lg" color="danger" />
              <Text color="danger">{label('delete')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space[3] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    paddingVertical: space[3],
  },
  group: { height: size.groupTitle, paddingTop: space[2] },
  danger: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
});
