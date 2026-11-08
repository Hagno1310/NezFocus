import type { ChannelResponse, ServerSummary } from '@nezfocus/shared';
import { ChevronDown, ChevronRight, UserPlus } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { channelSections } from '../../../domain/servers/drawer';
import {
  homeStore,
  selectServer,
  toggleCategory,
} from '../../../domain/servers/homeStore';
import { radius, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import {
  EmptyState,
  Skeleton,
  SystemBanner,
} from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { Text } from '../../../shared/ui/Text';
import { ChannelRow } from '../components/ChannelRow';
import { ServerMenu, type ServerMenuActions } from '../components/ServerMenu';
import { ServerRail } from '../components/ServerRail';

export type LeftDrawerActions = {
  onOpenChannel: (channel: ChannelResponse) => void; // text: closes the drawer onto it
  onOpenVoice: (channel: ChannelResponse) => void; // S-ROOM-01/02 not-joined
  onDirectMessages: () => void; // S-DM-01
  onAdd: () => void; // S-HOME-06
  onInvite: () => void; // S-HOME-07
  // S-HOME-09 rows (the menu itself opens here, from the server name)
  menu: Omit<ServerMenuActions, 'settings'> & {
    settings: (serverId: string) => void; // S-SET-01
  };
};

const SKELETON_ROWS = 8; // S-HOME-02 `loading`
const SKELETON_ROW = 40;

function ServerHead({
  server,
  onInvite,
  onServerMenu,
}: {
  server: ServerSummary;
  onInvite: () => void;
  onServerMenu: () => void;
}) {
  const { t } = useTranslation();
  const subtitle =
    server.template === 'study_server'
      ? t('servers.drawer.subtitleStudy', { count: server.member_count })
      : t('servers.drawer.subtitle', { count: server.member_count });
  return (
    <View style={styles.head}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={server.name}
        onPress={onServerMenu}
        style={styles.headRow}
      >
        <Text variant="headline" numberOfLines={1} style={styles.flex}>
          {server.name}
        </Text>
        <Icon as={ChevronDown} size="base" color="text-secondary" />
      </Pressable>
      <Text variant="label" color="text-tertiary" numberOfLines={1}>
        {subtitle}
      </Text>
      <View style={styles.invite}>
        <Button
          variant="secondary"
          size="S"
          icon={UserPlus}
          label={t('servers.drawer.invite')}
          onPress={onInvite}
        />
      </View>
    </View>
  );
}

function CategoryHeader({
  name,
  collapsed,
  onPress,
}: {
  name: string;
  collapsed: boolean;
  onPress: () => void;
}) {
  const title = name.toLocaleUpperCase('vi');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onPress}
      style={styles.category}
    >
      <Icon
        as={collapsed ? ChevronRight : ChevronDown}
        size="xs"
        color="text-tertiary"
      />
      <Text
        variant="label"
        weight="600"
        color="text-tertiary"
        numberOfLines={1}
        style={styles.flex}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function ChannelPanel({
  server,
  actions,
}: {
  server: ServerSummary;
  actions: LeftDrawerActions;
}) {
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const channels = useStore(homeStore, (s) => s.channels[server.id]);
  const collapsed = useStore(homeStore, (s) => s.collapsed[server.id]);
  const open = useStore(homeStore, (s) => s.open);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const selectedId = open?.serverId === server.id ? open.channelId : null;
  const sections = useMemo(
    () =>
      channels
        ? channelSections(channels, new Set(collapsed), selectedId)
        : null,
    [channels, collapsed, selectedId],
  );

  return (
    <View style={[styles.panel, { backgroundColor: colors['surface-1'] }]}>
      {offline && <SystemBanner kind="offline" />}
      <ScrollView contentContainerStyle={styles.list}>
        <ServerHead
          server={server}
          onInvite={actions.onInvite}
          onServerMenu={() => setMenuOpen(true)}
        />
        {sections
          ? sections.map(({ category, collapsed: isCollapsed, rows }) => (
              <Fragment key={category?.id ?? 'top'}>
                {category && (
                  <CategoryHeader
                    name={category.name}
                    collapsed={isCollapsed}
                    onPress={() => toggleCategory(server.id, category.id)}
                  />
                )}
                {rows.map((channel) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    selected={channel.id === selectedId}
                    onPress={() =>
                      channel.type === 'text'
                        ? actions.onOpenChannel(channel)
                        : actions.onOpenVoice(channel)
                    }
                  />
                ))}
              </Fragment>
            ))
          : Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <View key={i} style={styles.skeleton}>
                <Skeleton width="100%" height={SKELETON_ROW} />
              </View>
            ))}
      </ScrollView>
      <ServerMenu
        serverId={server.id}
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        actions={{
          ...actions.menu,
          settings: () => actions.menu.settings(server.id),
        }}
      />
    </View>
  );
}

// S-HOME-02 drawer content: rail + the channel list of the selected server.
export function LeftDrawer({ actions }: { actions: LeftDrawerActions }) {
  const insets = useSafeAreaInsets();
  const servers = useStore(homeStore, (s) => s.servers) ?? [];
  const selectedId = useStore(homeStore, (s) => s.selectedServerId);
  const server = servers.find((s) => s.id === selectedId);
  return (
    <View style={[styles.drawer, { paddingTop: insets.top }]}>
      <ServerRail
        servers={servers}
        selectedId={selectedId}
        onSelect={selectServer}
        onDirectMessages={actions.onDirectMessages}
        onAdd={actions.onAdd}
      />
      {server ? (
        <ChannelPanel server={server} actions={actions} />
      ) : (
        <ChannelPanelLoading />
      )}
    </View>
  );
}

// Before READY: the rail is empty and the list waits.
function ChannelPanelLoading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors['surface-1'] }]}>
      <View style={styles.list}>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <View key={i} style={styles.skeleton}>
            <Skeleton width="100%" height={SKELETON_ROW} />
          </View>
        ))}
      </View>
    </View>
  );
}

// S-HOME-02 `no-server`: the drawer is the root and cannot close; system Back leaves the app.
export function NoServerHome({
  onCreate,
  onJoinByCode,
  onDirectMessages,
}: {
  onCreate: () => void;
  onJoinByCode: () => void;
  onDirectMessages: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.drawer,
        { paddingTop: insets.top, backgroundColor: colors.bg },
      ]}
    >
      <ServerRail
        servers={[]}
        selectedId={null}
        onSelect={() => {}}
        onDirectMessages={onDirectMessages}
        onAdd={onCreate}
      />
      <View style={[styles.empty, { backgroundColor: colors['surface-1'] }]}>
        <EmptyState
          mascot
          title={t('servers.drawer.noServerTitle')}
          body={t('servers.drawer.noServerBody')}
        />
        <View style={styles.emptyActions}>
          <Button label={t('servers.drawer.createStudy')} onPress={onCreate} />
          <Button
            variant="secondary"
            label={t('servers.drawer.join')}
            onPress={onJoinByCode}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  drawer: { flex: 1, flexDirection: 'row' },
  panel: {
    flex: 1,
    borderTopRightRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  list: { paddingVertical: space[2] + space[1], paddingHorizontal: space[2] },
  head: {
    paddingTop: space[1],
    paddingHorizontal: space[2],
    paddingBottom: space[2],
    gap: space[1] / 2,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  invite: { paddingTop: space[2], alignItems: 'flex-start' },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingTop: space[2] + space[1],
    paddingHorizontal: space[2],
    paddingBottom: space[1],
  },
  skeleton: { marginBottom: space[1] },
  empty: { flex: 1, padding: space[3], justifyContent: 'center' },
  emptyActions: { paddingTop: space[4], gap: space[2] + space[1] },
});
