import type { ChannelResponse, ServerSummary } from '@nezfocus/shared';
import { ChevronDown, ChevronRight, Plus, UserPlus } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  dropTarget,
  reorderEntries,
  type MoveResult,
  type ReorderEntry,
} from '../../../domain/servers/channels';
import { channelSections } from '../../../domain/servers/drawer';
import { channelMenuRows } from '../../../domain/servers/serverAccess';
import {
  homeStore,
  openChannel,
  selectServer,
  toggleCategory,
} from '../../../domain/servers/homeStore';
import { Permission, hasPermission } from '@nezfocus/shared';
import Animated, {
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';
import {
  radius,
  size,
  space,
  touchSlop,
  useTheme,
} from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import {
  EmptyState,
  Skeleton,
  SystemBanner,
} from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import {
  CategoryDeleteDialog,
  CategoryRenameDialog,
} from '../components/CategoryDialogs';
import { CategoryMenu, ChannelMenu } from '../components/ChannelMenus';
import { CreateChannelSheet } from '../components/CreateChannelSheet';
import { ReorderList } from '../components/ReorderList';
import { useChannelActions } from '../hooks/useChannelActions';
import { useChannelText } from '../hooks/useChannelText';
import { useServerAccess } from '../hooks/useServerAccess';
import { ChannelRow } from '../components/ChannelRow';
import { ServerMenu, type ServerMenuActions } from '../components/ServerMenu';
import { ServerRail } from '../components/ServerRail';

export type LeftDrawerActions = {
  onOpenChannel: (channel: ChannelResponse) => void; // text: closes the drawer onto it
  onOpenVoice: (channel: ChannelResponse) => void; // S-ROOM-01/02 not-joined
  onDirectMessages: () => void; // S-DM-01
  onAdd: () => void; // S-HOME-06
  onInvite: () => void; // S-HOME-07
  // S-HOME-09 rows (the menu itself opens here, from the server name). "Tạo kênh" opens
  // S-SET-09 here too.
  menu: Omit<ServerMenuActions, 'settings' | 'createChannel'> & {
    settings: (serverId: string) => void; // S-SET-01
  };
  onChannelSettings: (channel: ChannelResponse) => void; // S-SET-06
  onCategoryPermissions: (category: ChannelResponse) => void; // `category-overwrites`
};

// An overlay that keeps what it shows while it animates out.
function useOverlay<T>() {
  const [state, setState] = useState<{ value: T | null; open: boolean }>({
    value: null,
    open: false,
  });
  return {
    value: state.value,
    open: state.open,
    show: (value: T) => setState({ value, open: true }),
    hide: () => setState((s) => ({ ...s, open: false })),
  };
}

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

// `category-menu`: with MANAGE_CHANNELS a long press opens the menu and `plus` creates a
// channel in it; without, a long press only collapses, like a tap.
function CategoryHeader({
  name,
  collapsed,
  onPress,
  onLongPress,
  onAdd,
}: {
  name: string;
  collapsed: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onAdd?: () => void;
}) {
  const { t } = useTranslation();
  const title = name.toLocaleUpperCase('vi');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onPress}
      onLongPress={onLongPress ?? onPress}
      disabled={!onPress}
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
      {onAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('servers.channels.categoryCreate', {
            name: title,
          })}
          hitSlop={touchSlop(size.icon.xl)}
          onPress={onAdd}
        >
          <Icon as={Plus} size="xl" color="text-tertiary" />
        </Pressable>
      )}
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const text = useChannelText();
  const channelActions = useChannelActions(server.id);
  const access = useServerAccess(server.id);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const viewport = useSharedValue(0);
  const perms = access?.perms ?? 0n;
  const manage = hasPermission(perms, Permission.MANAGE_CHANNELS);
  const [menuOpen, setMenuOpen] = useState(false);
  const channelMenu = useOverlay<ChannelResponse>();
  const categoryMenu = useOverlay<ChannelResponse>();
  const renaming = useOverlay<ChannelResponse>();
  const deleting = useOverlay<ChannelResponse>();
  const creating = useOverlay<{ categoryId?: string | null }>();
  const [reordering, setReordering] = useState<string | null>(null);
  const channels = useStore(homeStore, (s) => s.channels[server.id]);
  const collapsed = useStore(homeStore, (s) => s.collapsed[server.id]);
  const open = useStore(homeStore, (s) => s.open);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const selectedId = open?.serverId === server.id ? open.channelId : null;
  const sections = useMemo(
    () =>
      channels
        ? channelSections(
            channels,
            // While dragging every category is open, so every slot can be reached.
            new Set(reordering ? [] : collapsed),
            selectedId,
          )
        : null,
    [channels, collapsed, selectedId, reordering],
  );

  // SRV-02 AC1: saved on drop; a clash is `drop-blocked` (no API call), a failed save puts
  // the row back with "Chưa lưu được thay đổi · Thử lại".
  const move = async (channelId: string, insertAt: number) => {
    if (!sections) return;
    const target = dropTarget(reorderEntries(sections, channelId), insertAt);
    report(await channelActions.move(channelId, target));
  };
  const report = (result: MoveResult) => {
    if (result.ok) return;
    if (result.error === 'duplicate')
      return showToast({ message: text.duplicate(result.duplicate) });
    showToast({
      message: t('servers.settings.saveFailed'),
      action: {
        label: t('servers.settings.retry'),
        onPress: () => void result.retry().then(report),
      },
    });
  };

  const created = (channel: ChannelResponse) => {
    if (channel.type === 'text')
      openChannel({ serverId: channel.server_id, channelId: channel.id });
    else if (channel.type === 'voice') actions.onOpenVoice(channel);
  };

  const renderEntry = (entry: ReorderEntry, lifted: boolean) =>
    entry.kind === 'header' ? (
      <CategoryHeader name={entry.category.name} collapsed={false} />
    ) : (
      <ChannelRow
        channel={entry.channel}
        selected={lifted || entry.channel.id === selectedId}
        onPress={() => setReordering(null)}
      />
    );

  return (
    <View style={[styles.panel, { backgroundColor: colors['surface-1'] }]}>
      {offline && <SystemBanner kind="offline" />}
      <Animated.ScrollView
        ref={scrollRef}
        onLayout={(e) => viewport.set(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.list}
        scrollEnabled={!reordering}
      >
        <ServerHead
          server={server}
          onInvite={actions.onInvite}
          onServerMenu={() => setMenuOpen(true)}
        />
        {sections && reordering ? (
          <ReorderList
            sections={sections}
            draggedId={reordering}
            scroll={{ ref: scrollRef, offset: scrollOffset, viewport }}
            renderEntry={renderEntry}
            onDrop={(insertAt) => {
              const id = reordering;
              setReordering(null);
              void move(id, insertAt);
            }}
          />
        ) : sections ? (
          sections.map(({ category, collapsed: isCollapsed, rows }) => (
            <Fragment key={category?.id ?? 'top'}>
              {category && (
                <CategoryHeader
                  name={category.name}
                  collapsed={isCollapsed}
                  onPress={() => toggleCategory(server.id, category.id)}
                  onLongPress={
                    manage ? () => categoryMenu.show(category) : undefined
                  }
                  onAdd={
                    manage
                      ? () => creating.show({ categoryId: category.id })
                      : undefined
                  }
                />
              )}
              {rows.map((channel) => {
                const menuRows =
                  channel.type === 'category'
                    ? []
                    : channelMenuRows(perms, channel.type);
                return (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    selected={channel.id === selectedId}
                    onPress={() =>
                      channel.type === 'text'
                        ? actions.onOpenChannel(channel)
                        : actions.onOpenVoice(channel)
                    }
                    onLongPress={
                      menuRows.length
                        ? () => channelMenu.show(channel)
                        : undefined
                    }
                  />
                );
              })}
            </Fragment>
          ))
        ) : (
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <View key={i} style={styles.skeleton}>
              <Skeleton width="100%" height={SKELETON_ROW} />
            </View>
          ))
        )}
      </Animated.ScrollView>
      <ServerMenu
        serverId={server.id}
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        actions={{
          ...actions.menu,
          createChannel: () => creating.show({}),
          settings: () => actions.menu.settings(server.id),
        }}
      />
      <ChannelMenu
        visible={channelMenu.open}
        channel={channelMenu.value}
        rows={
          channelMenu.value && channelMenu.value.type !== 'category'
            ? channelMenuRows(perms, channelMenu.value.type)
            : []
        }
        onSettings={actions.onChannelSettings}
        onReorder={(c) => setReordering(c.id)}
        onDismiss={channelMenu.hide}
      />
      <CategoryMenu
        visible={categoryMenu.open}
        category={categoryMenu.value}
        count={
          channels?.filter((c) => c.parent_id === categoryMenu.value?.id)
            .length ?? 0
        }
        onPick={(action, category) =>
          action === 'rename'
            ? renaming.show(category)
            : action === 'delete'
              ? deleting.show(category)
              : actions.onCategoryPermissions(category)
        }
        onDismiss={categoryMenu.hide}
      />
      <CategoryRenameDialog
        visible={renaming.open}
        category={renaming.value}
        onDismiss={renaming.hide}
      />
      <CategoryDeleteDialog
        visible={deleting.open}
        category={deleting.value}
        onDismiss={deleting.hide}
      />
      <CreateChannelSheet
        serverId={server.id}
        visible={creating.open}
        categoryId={creating.value?.categoryId}
        onDismiss={creating.hide}
        onCreated={created}
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
