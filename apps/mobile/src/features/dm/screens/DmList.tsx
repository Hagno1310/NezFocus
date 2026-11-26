import type { DmChannel } from '@nezfocus/shared';
import {
  Ban,
  Check,
  CheckCheck,
  ChevronRight,
  Users,
  WifiOff,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { dmActions } from '../../../data/dm';
import { friendActions } from '../../../data/friends';
import { dmStore, showDm } from '../../../domain/dm/dmStore';
import { dmLine2, sortedDms } from '../../../domain/dm/dms';
import {
  friendsStore,
  incomingCount,
  requestTime,
} from '../../../domain/friends/friends';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { isUnread, unreadStore } from '../../../domain/messages/unread';
import { presenceStore } from '../../../domain/presence/presence';
import { sessionStore } from '../../../domain/session/sessionStore';
import { radius, space, useTheme } from '../../../shared/theme';
import { DMRow } from '../../../shared/ui/DMRow';
import { Banner, EmptyState, Skeleton } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { ActionSheet } from '../../../shared/ui/Overlay';
import { Badge } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { markChannelRead } from '../../chat/hooks/useUnread';
import { BlockDialog } from '../../friends/components/BlockDialog';

const SKELETON_ROWS = 6; // S-DM-01 `loading`
const SKELETON_LINES = [
  [90, 150],
  [70, 120],
  [110, 160],
  [80, 130],
  [100, 140],
  [60, 110],
] as const;

export const dmName = (d: DmChannel, deleted: string) =>
  d.recipient.deleted
    ? deleted
    : (d.recipient.display_name ?? d.recipient.username ?? '');

// S-DM-01 in the left drawer, beside the rail (spec 09).
export function DmList({ onFriends }: { onFriends: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { now, timeZone } = useChatClock();
  const state = useStore(dmStore);
  const unread = useStore(unreadStore);
  const presence = useStore(presenceStore, (s) => s.others);
  const relationships = useStore(friendsStore, (s) => s.byUser);
  const incoming = useStore(friendsStore, incomingCount);
  const meId = useStore(sessionStore, (s) => s.user?.id ?? null);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const dms = useMemo(() => sortedDms(state), [state]);
  const [menu, setMenu] = useState<DmChannel | null>(null);
  const [blocking, setBlocking] = useState<{ id: string; name: string } | null>(
    null,
  );
  const deletedName = t('dm.deleted');

  const time = (d: DmChannel) => {
    if (!d.last_message) return undefined;
    const at = requestTime(d.last_message.created_at, now, timeZone);
    return at.kind === 'yesterday' ? t('dm.yesterday') : at.text;
  };

  const row = (d: DmChannel) => {
    const u = unread[d.id];
    const count = isUnread(u) ? 1 : 0;
    const them = presence[d.recipient.id];
    // CR-24 #1: no activity when I blocked them (their side is filtered by the backend).
    const iBlocked = relationships[d.recipient.id]?.type === 'blocked';
    const line = dmLine2(d, {
      meId,
      unread: count > 0,
      activity: iBlocked ? null : (them?.activity ?? null),
    });
    return (
      <DMRow
        key={d.id}
        name={dmName(d, deletedName)}
        avatar={d.recipient.avatar?.['128']}
        deleted={d.recipient.deleted}
        presence={iBlocked ? undefined : (them?.status ?? 'offline')}
        time={time(d)}
        unread={count}
        activity={line.kind === 'activity' ? line.activity : null}
        message={
          line.kind === 'message'
            ? line.own
              ? t('dm.mine', { text: messageText(line) })
              : messageText(line)
            : undefined
        }
        onPress={() => showDm(d.id)}
        onLongPress={() => setMenu(d)}
      />
    );
  };

  // S-DM-01 › Nội dung chữ: "Đã gửi một ảnh" for a message of images only.
  function messageText(line: { text: string; image: boolean }) {
    return line.image ? t('chat.imageOnly') : line.text;
  }

  const failed = () =>
    showToast({ message: t('friends.addSheet.errors.generic') });
  const menuUser = menu && {
    id: menu.recipient.id,
    name: dmName(menu, deletedName),
  };
  const menuBlocked =
    !!menu && relationships[menu.recipient.id]?.type === 'blocked';

  return (
    <View style={[styles.panel, { backgroundColor: colors['surface-1'] }]}>
      <View style={styles.head}>
        <Text variant="headline">{t('dm.title')}</Text>
      </View>
      {offline && (
        <View style={styles.banner}>
          <Banner icon={WifiOff} text={t('ui.banner.offline')} />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onFriends}
        style={({ pressed }) => [
          styles.friends,
          pressed && { backgroundColor: colors['overlay-pressed'] },
        ]}
      >
        <Icon as={Users} size="lg" color="text-secondary" />
        <Text weight="500" style={styles.flex}>
          {t('dm.friends')}
        </Text>
        {incoming > 0 && <Badge count={incoming} />}
        <Icon as={ChevronRight} size="md" color="text-tertiary" />
      </Pressable>
      <View style={styles.spacer} />
      {dms.length ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {dms.map(row)}
        </ScrollView>
      ) : !state.loaded ? (
        SKELETON_LINES.slice(0, SKELETON_ROWS).map(([a, b], i) => (
          <View key={i} style={styles.skeleton}>
            <Skeleton width={40} height={40} round />
            <View style={styles.skeletonLines}>
              <Skeleton width={a} height={12} />
              <Skeleton width={b} height={10} />
            </View>
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <EmptyState
            mascot
            title={t('dm.empty.title')}
            body={t('dm.empty.body')}
            action={{
              variant: 'secondary',
              label: t('dm.empty.action'),
              onPress: onFriends,
            }}
          />
        </View>
      )}
      <ActionSheet
        visible={!!menu}
        title={menuUser?.name}
        cancel={false}
        onDismiss={() => setMenu(null)}
        groups={[
          {
            items: menu
              ? [
                  {
                    label: t('dm.menu.close'),
                    icon: X,
                    disabled: offline,
                    onPress: () => {
                      const id = menu.id;
                      setMenu(null);
                      dmActions.close(id).catch(failed);
                    },
                  },
                  ...(isUnread(unread[menu.id])
                    ? [
                        {
                          label: t('dm.menu.markRead'),
                          icon: CheckCheck,
                          disabled: offline,
                          onPress: () => {
                            setMenu(null);
                            markChannelRead(menu.id);
                          },
                        },
                      ]
                    : []),
                  ...(menu.recipient.deleted
                    ? []
                    : menuBlocked
                      ? [
                          {
                            label: t('dm.menu.unblock'),
                            icon: Check,
                            disabled: offline,
                            onPress: () => {
                              const id = menu.recipient.id;
                              setMenu(null);
                              friendActions.remove(id).catch(failed);
                            },
                          },
                        ]
                      : [
                          {
                            label: t('dm.menu.block'),
                            icon: Ban,
                            destructive: true,
                            disabled: offline,
                            onPress: () => {
                              setMenu(null);
                              setBlocking(menuUser);
                            },
                          },
                        ]),
                ]
              : [],
          },
        ]}
      />
      <BlockDialog user={blocking} onDismiss={() => setBlocking(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: {
    flex: 1,
    borderTopRightRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: 'hidden',
    paddingVertical: space[2] + space[1],
    paddingHorizontal: space[2],
  },
  head: {
    paddingTop: space[1],
    paddingLeft: space[2],
    paddingBottom: space[2],
  },
  banner: {
    borderRadius: radius.input,
    overflow: 'hidden',
    marginBottom: space[1],
  },
  friends: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // frame S-DM-01, like DMRow
    height: 48,
    paddingHorizontal: space[2],
    borderRadius: radius.input,
  },
  spacer: { height: space[2] },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space[2],
  },
  skeletonLines: { gap: space[2] },
  empty: { paddingTop: space[6] },
});
