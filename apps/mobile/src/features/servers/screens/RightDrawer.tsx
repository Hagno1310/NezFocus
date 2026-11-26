import { Hash, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { Permission, hasPermission } from '@nezfocus/shared';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { openInviteSheet } from '../../../domain/invites/inviteSheetStore';
import { presenceStore } from '../../../domain/presence/presence';
import { homeStore } from '../../../domain/servers/homeStore';
import { drawerGroups } from '../../../domain/servers/members';
import { sessionStore } from '../../../domain/session/sessionStore';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Skeleton, SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { MemberItem } from '../components/MemberItem';
import { useMembers } from '../hooks/useMembers';
import { useServerAccess } from '../hooks/useServerAccess';
import { openMemberProfile } from '../../../domain/friends/profileSheet';
import { requestJump } from '../../../domain/messages/jumps';
import { PinnedList } from '../../chat/components/PinnedList';
import { useChannelAbilities } from '../../chat/hooks/useCanSend';
import { usePins } from '../../chat/hooks/usePins';

type Tab = 'members' | 'tasks' | 'pins';

// The segment picked, per channel, for this run of the app (spec 02 S-HOME-03).
const tabs = new Map<string, Tab>();

// S-HOME-03 drawer phải: `members`, `loading`, `offline`; Edge case `alone-in-server`.
export function RightDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const current = useStore(homeStore, (s) => s.open);
  const channel = useStore(homeStore, (s) =>
    current
      ? s.channels[current.serverId]?.find((c) => c.id === current.channelId)
      : undefined,
  );
  const [, redraw] = useState(0);
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors['surface-1'], paddingTop: top },
      ]}
    >
      {current && channel ? (
        <ChannelMembers
          key={current.channelId}
          serverId={current.serverId}
          channelId={current.channelId}
          name={channel.name}
          open={open}
          onClose={onClose}
          tab={tabs.get(current.channelId) ?? 'members'}
          onTab={(next) => {
            tabs.set(current.channelId, next);
            redraw((n) => n + 1);
          }}
        />
      ) : null}
    </View>
  );
}

function ChannelMembers({
  serverId,
  channelId,
  name,
  open,
  onClose,
  tab,
  onTab,
}: {
  serverId: string;
  channelId: string;
  name: string;
  open: boolean;
  onClose: () => void;
  tab: Tab;
  onTab: (tab: Tab) => void;
}) {
  const { t } = useTranslation();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const access = useServerAccess(serverId);
  const members = useMembers(serverId, channelId);
  const { now, timeZone } = useChatClock();
  const meId = useStore(sessionStore, (s) => s.user?.id);
  const pins = usePins(channelId, open);
  const abilities = useChannelAbilities(serverId, channelId);
  // Groups as they were when the drawer opened: no re-sort while it is open (S-HOME-03).
  const snapshot = () => {
    const { others, mine } = presenceStore.getState();
    const statuses: Record<string, string> = Object.fromEntries(
      Object.entries(others).map(([id, p]) => [id, p.status]),
    );
    if (meId) statuses[meId] = mine === 'invisible' ? 'offline' : mine;
    return statuses;
  };
  const [frozen, setFrozen] = useState(snapshot);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFrozen(snapshot());
  }
  // Opening asks again: a role given meanwhile changes who sees the channel.
  const { refetch } = members;
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  if (!access) return null;
  const list = members.data;
  const groups = drawerGroups(list ?? [], (id) => frozen[id] ?? 'offline');
  const alone =
    access.server.member_count === 1 &&
    list?.length === 1 &&
    list[0]!.user.id === meId;
  const canInvite = hasPermission(access.perms, Permission.CREATE_INVITE);
  const rows = [
    ...(groups.online.length
      ? [{ head: t('servers.members.online', { count: groups.online.length }) }]
      : []),
    ...groups.online.map((m) => ({ member: m })),
    ...(groups.offline.length
      ? [
          {
            head: t('servers.members.offline', {
              count: groups.offline.length,
            }),
          },
        ]
      : []),
    ...groups.offline.map((m) => ({ member: m })),
  ];

  return (
    <>
      <View style={styles.head}>
        <View style={styles.title}>
          <Icon as={Hash} size="base" color="text-tertiary" />
          <Text variant="headline" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
        </View>
        <SegmentedControl<Tab>
          segments={[
            { key: 'members', label: t('servers.members.tabMembers') },
            { key: 'tasks', label: t('servers.members.tabTasks') },
            // "Ghim · 3" once there are pins (S-HOME-03 › Nội dung chữ).
            {
              key: 'pins',
              label: t('servers.members.tabPins'),
              count: pins?.length || undefined,
            },
          ]}
          value={tab}
          onChange={onTab}
          dense
        />
      </View>
      {offline && <SystemBanner kind="offline" />}
      {tab === 'pins' ? (
        <PinnedList
          channelId={channelId}
          pins={pins ?? null}
          canUnpin={abilities.canManage}
          online={!offline}
          // S-HOME-03 › Tương tác: close the drawer, bring the message into view.
          onOpen={(m) => {
            onClose();
            requestJump({ channelId, messageId: m.id, times: 1 });
          }}
        />
      ) : tab === 'tasks' ? (
        // ponytail: Việc is P4-A1 (#32); until then the placeholder sentence.
        <Text variant="body-sm" color="text-secondary" style={styles.soon}>
          {t('placeholder.noteTicket', { ticket: 'P4-A1 (#32)' })}
        </Text>
      ) : !list ? (
        <View style={styles.loading}>
          {Array.from({ length: 8 }, (_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={32} height={32} round />
              <Skeleton width="55%" height={12} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => ('head' in r ? r.head : r.member.user.id)}
          ListFooterComponent={
            alone ? (
              <View style={styles.alone}>
                <Text variant="headline" style={styles.center}>
                  {t('servers.members.alone')}
                </Text>
                <Text color="text-secondary" style={styles.center}>
                  {t('servers.members.aloneBody')}
                </Text>
                {canInvite && (
                  <Button
                    variant="secondary"
                    size="S"
                    icon={UserPlus}
                    label={t('servers.members.invite')}
                    onPress={() => openInviteSheet(serverId)}
                  />
                )}
              </View>
            ) : undefined
          }
          renderItem={({ item }) =>
            'head' in item ? (
              <SectionLabel style={styles.group}>{item.head}</SectionLabel>
            ) : (
              <MemberItem
                member={item.member}
                server={access.server}
                roles={access.roles ?? []}
                now={now}
                timeZone={timeZone}
                activity
                onPress={() =>
                  openMemberProfile(item.member.user.id, {
                    serverId: access.server.id,
                  })
                }
              />
            )
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderTopLeftRadius: radius.sheet,
    borderBottomLeftRadius: radius.sheet,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  head: {
    paddingHorizontal: space[3],
    paddingTop: space[3],
    paddingBottom: space[2],
    gap: space[3],
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  group: {
    minHeight: size.groupTitle,
    paddingTop: space[2],
    paddingHorizontal: space[3],
  },
  soon: { padding: space[3] },
  loading: { paddingHorizontal: space[3], gap: space[3], paddingTop: space[3] },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
  alone: {
    alignItems: 'center',
    gap: space[2],
    paddingTop: space[5],
    paddingHorizontal: space[3],
  },
  center: { textAlign: 'center' },
});
