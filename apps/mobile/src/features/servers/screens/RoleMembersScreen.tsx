import {
  Permission,
  canManageRole,
  compareMembers,
  hasPermission,
  matchesMember,
  memberName,
  parsePermissionBitmap,
  type ServerMember,
} from '@nezfocus/shared';
import { Shield, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { memberBlock } from '../../../domain/servers/members';
import { roleActor, type RoleActor } from '../../../domain/servers/roles';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { SearchField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { MemberItem } from '../components/MemberItem';
import { useMembers, useSetMemberRole } from '../hooks/useMembers';
import { useServerAccess } from '../hooks/useServerAccess';

// S-SET-02 `role-members` and `role-members-add` (CR-28 #23: one request per person).
export function RoleMembersScreen({
  serverId,
  roleId,
  onBack,
}: {
  serverId: string;
  roleId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const access = useServerAccess(serverId);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const { now, timeZone } = useChatClock();
  const members = useMembers(serverId);
  const setRole = useSetMemberRole(serverId);
  const [adding, setAdding] = useState(false);
  const role = access?.roles?.find((r) => r.id === roleId);
  if (!access?.userId || !access.roles || !role) return null;

  const actor = roleActor(
    access.server,
    access.roles,
    access.userId,
    access.roleIds,
  );
  const manages =
    hasPermission(access.perms, Permission.MANAGE_ROLES) &&
    canManageRole(actor.server, actor.member, {
      id: role.id,
      permissions: parsePermissionBitmap(role.permissions),
      position: role.position,
    });
  const editable = (m: ServerMember) =>
    manages && !offline && memberBlock(access.server, actor, m) === null;
  const holders = (members.data ?? []).filter((m) =>
    m.role_ids.includes(roleId),
  );

  const failed = (error: string) =>
    showToast(
      error === 'hierarchy'
        ? { message: t('servers.roles.outranked'), icon: Shield }
        : { message: t('servers.settings.saveFailed') },
    );

  const remove = async (m: ServerMember) => {
    const name = memberName(m);
    const r = await setRole(m.user.id, roleId, false);
    if (!r.ok) return failed(r.error);
    showToast({
      message: t('servers.members.removed', { role: role.name, name }),
      action: {
        label: t('servers.members.undo'),
        onPress: () =>
          void setRole(m.user.id, roleId, true).then(
            (u) => !u.ok && failed(u.error),
          ),
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={t('servers.members.roleTitle', { role: role.name })}
        onBack={onBack}
      />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView contentContainerStyle={{ paddingBottom: bottom }}>
        {members.data && (
          <SectionLabel style={styles.group}>
            {t('servers.members.count', { count: holders.length })}
          </SectionLabel>
        )}
        {holders.map((m) => (
          <MemberItem
            key={m.user.id}
            member={m}
            server={access.server}
            roles={access.roles ?? []}
            now={now}
            timeZone={timeZone}
            variant="username"
            label=""
            right={
              editable(m) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('servers.members.remove', {
                    role: role.name,
                    name: memberName(m),
                  })}
                  hitSlop={space[3]}
                  onPress={() => void remove(m)}
                >
                  <Icon as={X} size="base" color="text-secondary" />
                </Pressable>
              ) : undefined
            }
          />
        ))}
        {manages && members.data && (
          <Button
            variant="secondary"
            label={t('servers.members.add')}
            fullWidth
            disabled={offline}
            onPress={() => setAdding(true)}
            style={styles.add}
          />
        )}
      </ScrollView>
      <AddSheet
        visible={adding}
        roleName={role.name}
        roleId={roleId}
        members={members.data ?? []}
        actor={actor}
        server={access.server}
        roles={access.roles}
        now={now}
        timeZone={timeZone}
        onDismiss={() => setAdding(false)}
        add={async (ids) => {
          const results = await Promise.all(
            ids.map((id) => setRole(id, roleId, true)),
          );
          const bad = results.find((r) => !r.ok);
          if (bad && !bad.ok) failed(bad.error);
          setAdding(false);
        }}
      />
    </View>
  );
}

function AddSheet({
  visible,
  roleName,
  roleId,
  members,
  actor,
  server,
  roles,
  now,
  timeZone,
  onDismiss,
  add,
}: {
  visible: boolean;
  roleName: string;
  roleId: string;
  members: readonly ServerMember[];
  actor: RoleActor;
  server: Parameters<typeof memberBlock>[0];
  roles: Parameters<typeof MemberItem>[0]['roles'];
  now: number;
  timeZone: string;
  onDismiss: () => void;
  add: (userIds: string[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const shown = [...members]
    .sort(compareMembers)
    .filter((m) => matchesMember(m, query));
  const close = () => {
    setQuery('');
    setPicked([]);
    onDismiss();
  };
  return (
    <BottomSheet
      visible={visible}
      title={t('servers.members.addTitle', { role: roleName })}
      onDismiss={close}
      action={{
        label: t('servers.members.addAction', { count: picked.length }),
        disabled: picked.length === 0,
        loading: saving,
        onPress: () => {
          setSaving(true);
          void add(picked).finally(() => {
            setSaving(false);
            setQuery('');
            setPicked([]);
          });
        },
      }}
    >
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('servers.members.addSearch')}
      />
      <ScrollView
        // Rows run edge to edge: MemberRow has its own 16 (frame `role-members-add`).
        style={{ maxHeight: height * 0.55, marginHorizontal: -space[3] }}
        keyboardShouldPersistTaps="handled"
      >
        {shown.map((m) => {
          const has = m.role_ids.includes(roleId);
          const blocked = memberBlock(server, actor, m) !== null;
          const on = picked.includes(m.user.id);
          const toggle = () =>
            setPicked(
              on
                ? picked.filter((id) => id !== m.user.id)
                : [...picked, m.user.id],
            );
          return (
            <MemberItem
              key={m.user.id}
              member={m}
              server={server}
              roles={roles}
              now={now}
              timeZone={timeZone}
              variant="username"
              label={has ? t('servers.members.hasRole') : ''}
              onPress={has || blocked ? undefined : toggle}
              right={
                <Checkbox
                  boxOnly
                  label={memberName(m)}
                  checked={has || on}
                  locked={has}
                  disabled={blocked && !has}
                  onChange={toggle}
                />
              }
            />
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  group: {
    height: size.groupTitle,
    paddingTop: space[2],
    paddingHorizontal: space[3],
  },
  add: { marginTop: space[3], marginHorizontal: space[3] },
});
