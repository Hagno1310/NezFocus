import {
  categoryTitle,
  type PermissionOverwrite,
  type RoleResponse,
} from '@nezfocus/shared';
import { Lock, Shield, User, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addTargets,
  canEditTarget,
  channelLabel,
  searchKey,
  overwriteSummary,
  shownOverwrites,
} from '../../../domain/servers/channelPermissions';
import { useOnOpen } from '../../../shared/hooks/useOnOpen';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { SearchField } from '../../../shared/ui/TextField';
import {
  useOverwrites,
  useTargetName,
  type Target,
} from '../hooks/useOverwrites';
import { NoteLine } from '../../../shared/ui/NoteLine';

// S-SET-06 `overwrites`, `overwrites-synced`, `category-overwrites`, `add-target`.
// Synced: the category's rows, disabled, with "Sửa quyền danh mục ›".
export function ChannelPermissionsScreen({
  serverId,
  channelId,
  onBack,
  onEdit,
  onCategory,
  onClose,
}: {
  serverId: string;
  channelId: string;
  onBack: () => void;
  onEdit: (target: Target) => void;
  onCategory: (categoryId: string) => void;
  onClose: () => void; // back to the drawer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const o = useOverwrites(serverId, channelId, onClose);
  const nameOf = useTargetName(o.access?.roles);
  const [adding, setAdding] = useState(false);
  const { channel, parent, access } = o;
  if (!channel || !access?.userId) return null;
  const roles = access.roles ?? [];
  const actor = { userId: access.userId, roleIds: access.roleIds };
  const isCategory = channel.type === 'category';
  const synced = !isCategory && channel.permissions_synced && !!parent;
  const rows = shownOverwrites(channel, o.channels, roles);
  const parentName = parent ? categoryTitle(parent.name) : '';
  const followers = isCategory
    ? o.channels.filter(
        (c) => c.parent_id === channel.id && c.permissions_synced,
      )
    : [];

  const summary = (row: PermissionOverwrite) => {
    const { allow, deny } = overwriteSummary(row, channel.type);
    const parts = [
      allow && t('servers.overwrites.allowCount', { count: allow }),
      deny && t('servers.overwrites.denyCount', { count: deny }),
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : t('servers.overwrites.none');
  };

  const group = isCategory
    ? t('servers.overwrites.groupCategory')
    : synced
      ? t('servers.overwrites.groupSynced', { name: parentName })
      : t('servers.overwrites.groupOwn');

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={
          isCategory
            ? t('servers.overwrites.categoryTitle', {
                name: categoryTitle(channel.name),
              })
            : t('servers.overwrites.title')
        }
        onBack={onBack}
      />
      {o.offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        {!isCategory && (
          <Text variant="label" color="text-secondary" numberOfLines={1}>
            {channelLabel(channel)}
          </Text>
        )}
        {!isCategory && parent && (
          <SettingsRow
            label={t('servers.overwrites.sync', { name: parentName })}
            description={
              synced
                ? t('servers.overwrites.syncedHint', { name: parentName })
                : undefined
            }
            toggle={{
              value: channel.permissions_synced,
              onChange: (v) => void o.setSynced(v),
            }}
            disabled={o.offline}
          />
        )}
        {isCategory && (
          <NoteLine
            text={
              followers.length
                ? t('servers.overwrites.categoryNoteSynced', {
                    count: followers.length,
                    names: followers.map(channelLabel).join(', '),
                  })
                : t('servers.overwrites.categoryNote')
            }
          />
        )}
        <Text
          variant="label"
          weight="600"
          color="text-tertiary"
          style={styles.group}
        >
          {group}
        </Text>
        {rows.map((row) => {
          const editable = canEditTarget(access.server, roles, actor, row);
          const everyone = row.target_id === serverId;
          return (
            <SettingsRow
              key={`${row.target_type}:${row.target_id}`}
              icon={
                !editable && !synced
                  ? Lock
                  : row.target_type === 'member'
                    ? User
                    : everyone
                      ? Users
                      : Shield
              }
              label={nameOf(row)}
              value={summary(row)}
              // Spec 08 › Hiện theo quyền: blocked by hierarchy → shown, locked, with a reason.
              description={
                !editable && !synced
                  ? t('servers.overwrites.lockedTarget')
                  : undefined
              }
              disabled={synced || o.offline || !editable}
              onPress={() => onEdit(row)}
            />
          );
        })}
        {synced && rows.length === 0 && (
          <>
            <SettingsRow
              icon={Users}
              label="@everyone"
              value={t('servers.overwrites.none')}
              disabled
            />
            <NoteLine
              text={t('servers.overwrites.categoryEmpty', { name: parentName })}
            />
          </>
        )}
        {synced && parent && (
          <SettingsRow
            label={t('servers.overwrites.editCategory')}
            onPress={() => onCategory(parent.id)}
          />
        )}
        {!synced && rows.length === 0 && (
          <NoteLine text={t('servers.overwrites.empty')} />
        )}
        {!synced && (
          <Button
            variant="secondary"
            label={t('servers.overwrites.add')}
            fullWidth
            disabled={o.offline}
            onPress={() => setAdding(true)}
            style={styles.add}
          />
        )}
      </ScrollView>
      <AddTargetSheet
        visible={adding}
        targets={addTargets(access.server, roles, channel, actor)}
        onDismiss={() => setAdding(false)}
        onPick={(role) => {
          setAdding(false);
          onEdit({ target_id: role.id, target_type: 'role' });
        }}
      />
    </View>
  );
}

// `add-target`: VAI TRÒ by rank, a role level with or above the caller disabled.
// ponytail: the THÀNH VIÊN group (MemberRow · username) needs the member list, P2-A2 (#15).
function AddTargetSheet({
  visible,
  targets,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  targets: ReturnType<typeof addTargets>;
  onDismiss: () => void;
  onPick: (role: RoleResponse) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  useOnOpen(visible, () => setQuery(''));
  const q = searchKey(query.trim());
  const shown = targets.filter((x) => searchKey(x.role.name).includes(q));
  return (
    <BottomSheet
      visible={visible}
      title={t('servers.overwrites.add')}
      onDismiss={onDismiss}
    >
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('servers.overwrites.search')}
      />
      <Text
        variant="label"
        weight="600"
        color="text-tertiary"
        style={styles.group}
      >
        {t('servers.overwrites.rolesGroup')}
      </Text>
      {shown.map(({ role, locked }) => (
        <SettingsRow
          key={role.id}
          icon={locked ? Lock : Shield}
          label={role.name}
          disabled={locked}
          onPress={() => onPick(role)}
        />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[3], gap: space[1] },
  group: { height: size.groupTitle, paddingTop: space[2] },
  add: { marginTop: space[3] },
});
