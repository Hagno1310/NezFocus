import {
  Permission,
  hasPermission,
  type OverwriteTargetType,
  type PermissionName,
} from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  canEditTarget,
  overwritePermissions,
  triOf,
} from '../../../domain/servers/channelPermissions';
import type { vi } from '../../../shared/i18n/vi';
import {
  fontScale as textScale,
  size,
  space,
  useTheme,
} from '../../../shared/theme';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { TriState } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { useOverwrites } from '../hooks/useOverwrites';
import { channelLabel, useTargetName } from './ChannelPermissionsScreen';
import { NoteLine } from './RolesScreen';

type PermissionLabels = (typeof vi)['permissions']['labels'];

// S-SET-06 `overwrite-edit`, `overwrite-edit-voice`; Edge case `overwrite-large-text`,
// `overwrite-360`. Each step saves at once; "Cho phép" is off for a bit the caller lacks
// in the channel (8.5.2).
export function OverwriteEditScreen({
  serverId,
  channelId,
  targetId,
  targetType,
  onBack,
  onClose,
}: {
  serverId: string;
  channelId: string;
  targetId: string;
  targetType: OverwriteTargetType;
  onBack: () => void;
  onClose: () => void; // back to the drawer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const o = useOverwrites(serverId, channelId, onClose);
  const nameOf = useTargetName(o.access?.roles);
  const { channel, access } = o;
  if (!channel || !access?.userId) return null;
  const target = { target_id: targetId, target_type: targetType };
  const saved = channel.permission_overwrites.find(
    (x) => x.target_id === targetId && x.target_type === targetType,
  );
  const synced =
    channel.type !== 'category' && channel.permissions_synced && !!o.parent;
  const editable =
    !synced &&
    canEditTarget(
      access.server,
      access.roles ?? [],
      { userId: access.userId, roleIds: access.roleIds },
      target,
    );
  const name = nameOf(target);
  // `overwrite-large-text`: the channel name moves to its own line, never cut at a "-".
  const large = fontScale >= textScale.large;

  const label = (p: PermissionName) =>
    channel.type === 'voice' && p === 'SEND_MESSAGES'
      ? t('servers.overwrites.voiceSend')
      : t(`permissions.labels.${p as keyof PermissionLabels}`);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={
          large
            ? name
            : t('servers.overwrites.editTitle', {
                target: name,
                channel: channelLabel(channel),
              })
        }
        onBack={onBack}
      />
      {o.offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        {large && (
          <NoteLine
            text={`${t('servers.overwrites.editSubtitle')}\n${channelLabel(channel)}`}
          />
        )}
        <NoteLine text={t('servers.overwrites.defaultHint')} />
        {overwritePermissions(channel.type).map((p) => (
          <View key={p} style={styles.row}>
            <Text weight="500" style={styles.label}>
              {label(p)}
            </Text>
            <TriState
              label={label(p)}
              value={o.pendingTri(target, p) ?? triOf(saved, p)}
              onChange={(v) => void o.setTri(target, p, v)}
              disabled={!editable || o.offline}
              allowDisabled={!hasPermission(o.perms, Permission[p])}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[3], gap: space[1] },
  // Long labels wrap on the left; the three steps keep their size, on top (`overwrite-360`).
  row: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2] + space[1],
    paddingVertical: space[2],
  },
  label: { flex: 1, paddingTop: space[1] },
});
