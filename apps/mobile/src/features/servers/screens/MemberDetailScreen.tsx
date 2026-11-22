import {
  Permission,
  hasPermission,
  memberName,
  type RoleResponse,
} from '@nezfocus/shared';
import { Lock, Shield } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  memberBlock,
  memberRoleRows,
  sinceText,
} from '../../../domain/servers/members';
import { roleActor } from '../../../domain/servers/roles';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { avatarUri } from '../../me/avatarUri';
import { useShownPresence } from '../../presence/hooks/usePresence';
import { size, space, useTheme } from '../../../shared/theme';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { NoteLine } from '../../../shared/ui/NoteLine';
import { Avatar } from '../../../shared/ui/People';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useMembers, useSetMemberRole } from '../hooks/useMembers';
import { useServerAccess } from '../hooks/useServerAccess';

// S-SET-03 `member-detail` (VAI TRÒ only), `member-blocked`, `save-error`, `offline`; Edge case
// P2 "người đó rời server". ponytail: the KIỂM DUYỆT group comes with P3-A3.2 (#127).
export function MemberDetailScreen({
  serverId,
  userId,
  onBack,
}: {
  serverId: string;
  userId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const access = useServerAccess(serverId);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const { timeZone } = useChatClock();
  const members = useMembers(serverId);
  const setRole = useSetMemberRole(serverId);
  const presence = useShownPresence(userId);
  const [refused, setRefused] = useState(false); // 40401 on a save: they left meanwhile
  const member = members.data?.find((m) => m.user.id === userId);
  // Kept from the last time they were in the list, for "{tên} không còn trong server".
  const [last, setLast] = useState(member);
  if (member && member !== last) setLast(member);
  const shown = member ?? last;
  if (!access?.userId || !access.roles || !shown) return null;

  const name = memberName(shown);
  const gone = refused || (!!members.data && !member);
  const actor = roleActor(
    access.server,
    access.roles,
    access.userId,
    access.roleIds,
  );
  const block = memberBlock(access.server, actor, shown);
  const canRoles = hasPermission(access.perms, Permission.MANAGE_ROLES);
  const rows = memberRoleRows(access.server, access.roles, actor, shown);

  const toggle = async (role: RoleResponse, give: boolean) => {
    const r = await setRole(userId, role.id, give);
    if (r.ok) return;
    if (r.error === 'gone') return setRefused(true);
    if (r.error === 'hierarchy')
      return showToast({ message: t('servers.roles.outranked'), icon: Shield });
    if (r.error === 'forbidden')
      return showToast({ message: t('servers.roles.lostAccess') });
    showToast({
      message: t('servers.settings.saveFailed'),
      action: {
        label: t('servers.settings.retry'),
        onPress: () => void toggle(role, give),
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={name} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        <View style={styles.head}>
          <Avatar
            name={name}
            uri={avatarUri(shown.user.avatar, '128')}
            size={56}
            presence={gone ? undefined : presence.status}
          />
          <View style={styles.flex}>
            <Text variant="title-2" numberOfLines={1}>
              {name}
            </Text>
            {shown.user.username && (
              <Text color="text-secondary" numberOfLines={1}>
                {shown.user.username}
              </Text>
            )}
            <Text variant="label" color="text-tertiary">
              {t('servers.members.since', {
                date: sinceText(shown.joined_at, timeZone),
              })}
            </Text>
          </View>
        </View>
        {gone ? (
          <NoteLine text={t('servers.members.gone', { name })} />
        ) : (
          <>
            {block && (
              <NoteLine
                icon={Lock}
                text={t(
                  block === 'owner'
                    ? 'servers.members.blockedOwner'
                    : 'servers.members.blockedOutranked',
                  { name },
                )}
              />
            )}
            {canRoles && rows.length > 0 && (
              <>
                <SectionLabel style={styles.group}>
                  {t('servers.members.roles')}
                </SectionLabel>
                {rows.map((r) => (
                  <Checkbox
                    key={r.role.id}
                    label={r.role.name}
                    checked={r.checked}
                    disabled={r.locked || offline}
                    onChange={(next) => void toggle(r.role, next)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: space[3], gap: space[2] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
  },
  group: { minHeight: size.groupTitle, paddingTop: space[2] },
});
