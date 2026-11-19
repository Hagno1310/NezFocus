import type { MessageResponse } from '@nezfocus/shared';
import type { TFunction } from 'i18next';
import {
  CloudOff,
  RotateCw,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useStore } from 'zustand';
import type { LastActive } from '../../../domain/account/sessions';
import {
  chatRows,
  composerCount,
  itemKey,
  newBelow,
  type ChatRow,
  type DayLabel,
} from '../../../domain/messages/chatRows';
import { drafts } from '../../../domain/messages/drafts';
import type { ChatItem } from '../../../domain/messages/messageStore';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import {
  ChannelStart,
  DateDivider,
  JumpPill,
  MessageBubble,
  type MessageStatus,
} from '../../../shared/ui/Chat';
import { Composer } from '../../../shared/ui/Composer';
import { Skeleton } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { ActionSheet, type Lifted } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useMe } from '../../me/hooks/useMe';
import { avatarUri } from '../../me/avatarUri';
import { useChannelMessages } from '../hooks/useChannelMessages';
import { useChatClock } from '../hooks/useChatClock';
import { useSendMessage } from '../hooks/useSendMessage';

// Offset from the bottom (the list is inverted) under which the list counts as "at the bottom".
const AT_BOTTOM = 48;

export const dayText = (t: TFunction, d: DayLabel) =>
  d.kind === 'today'
    ? t('chat.today')
    : d.kind === 'yesterday'
      ? t('chat.yesterday')
      : t('chat.dayDate', {
          weekday: t('chat.weekdays').split('|')[d.weekday],
          date: d.date,
        });

// C-10 Giờ ở đầu tin: "20:02" · "Hôm qua 20:00" · "16/10/2026 20:00".
export const timeText = (t: TFunction, at: LastActive, spoken = false) =>
  at.kind === 'today'
    ? at.time
    : at.kind === 'yesterday'
      ? t(spoken ? 'chat.a11yTimeYesterday' : 'chat.timeYesterday', {
          time: at.time,
        })
      : t('chat.timeDate', { date: at.date, time: at.time });

type Measurable = {
  measureInWindow: (cb: (x: number, y: number) => void) => void;
};

type Author = { name: string; uri: string | null; deleted: boolean };

// S-HOME-01 body: the message list, its states and the Composer. The header, the strip under it
// and the strip over the Composer are slots, so S-DM-02 (P2-B3.3, #116) reuses it.
export function ChatView({
  channelId,
  serverId,
  channelName,
  placeholder,
  header,
  belowHeader,
  aboveComposer,
  disabled,
}: {
  channelId: string;
  serverId: string | null;
  channelName: string;
  placeholder: string;
  header: ReactNode;
  belowHeader?: ReactNode;
  // The typing line (P2-B1.3, #109).
  aboveComposer?: ReactNode;
  disabled?: { icon: LucideIcon; text: string };
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const me = useMe().data;
  const myId = me?.id ?? '';
  const { now, timeZone } = useChatClock();
  const view = useChannelMessages(channelId, serverId);
  const outbox = useSendMessage(channelId);
  const rows = useMemo(
    () => chatRows(view.items, { now, timeZone, myId }).reverse(),
    [view.items, now, timeZone, myId],
  );

  const list = useRef<FlatList<ChatRow>>(null);
  // Newest row seen while at the bottom; null = at the bottom now.
  const [leftAt, setLeftAt] = useState<string | null>(null);
  const newest = view.items.at(-1);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const away = e.nativeEvent.contentOffset.y > AT_BOTTOM;
    if (!away && leftAt !== null) setLeftAt(null);
    if (away && leftAt === null) setLeftAt(newest ? itemKey(newest) : '');
  };
  const toBottom = useCallback(() => {
    list.current?.scrollToOffset({ offset: 0, animated: true });
    setLeftAt(null);
  }, []);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const onTop = () => {
    if (loadingOlder || view.reachedStart || !view.items.length) return;
    setLoadingOlder(true);
    void view
      .loadOlder()
      .catch(() => {})
      .finally(() => setLoadingOlder(false));
  };

  const draft = useStore(drafts.state, (s) => s[channelId] ?? '');
  const count = composerCount(draft);
  const send = () => {
    if (!count.canSend) return;
    void outbox.send(draft.trim());
    drafts.set(channelId, '');
    toBottom();
  };

  const [failed, setFailed] = useState<{
    nonce: string;
    lifted: Lifted;
  } | null>(null);

  const author = (row: Extract<ChatRow, { kind: 'message' }>): Author => {
    if (row.item.kind === 'outbox' || row.authorId === myId)
      return {
        name: me?.display_name ?? me?.username ?? '',
        uri: avatarUri(me?.avatar, '128'),
        deleted: false,
      };
    const a = (row.item.message as MessageResponse).author;
    return {
      name: a.display_name ?? a.username ?? t('ui.deletedUser'),
      uri: avatarUri(a.avatar, '128'),
      deleted: a.username === null,
    };
  };

  const statusOf = (item: ChatItem): MessageStatus | undefined => {
    if (item.kind !== 'outbox') return undefined;
    // ponytail: 40029 shows as failed until the countdown line of `rate-limited`, P2-A4.3 (#105).
    return item.entry.status === 'failed'
      ? { kind: 'failed', text: t('chat.failed') }
      : { kind: 'pending', offline: !online };
  };

  const bubble = (
    row: Extract<ChatRow, { kind: 'message' }>,
    lifted = false,
  ) => {
    const who = author(row);
    const content =
      row.item.kind === 'outbox'
        ? row.item.entry.content
        : row.item.message.content;
    const time = timeText(t, row.time);
    const status = statusOf(row.item);
    const isFailed = status?.kind === 'failed';
    const nonce = row.item.kind === 'outbox' ? row.item.entry.nonce : null;
    return (
      <MessageBubble
        name={who.name}
        avatarUri={who.uri}
        deleted={who.deleted}
        self={row.authorId === myId}
        time={time}
        head={row.head}
        status={status}
        surface={lifted ? 'surface-2' : undefined}
        liftedTime={lifted ? row.time.time : undefined}
        accessibilityLabel={[
          t('chat.a11yMessage', {
            name: who.name,
            time: timeText(t, row.time, true),
            content,
          }),
          isFailed ? t('chat.failed') : null,
        ]
          .filter(Boolean)
          .join(', ')}
        // S-HOME-01 › Tương tác: a failed message opens S-HOME-04 `failed-message`.
        onPress={
          isFailed && nonce
            ? (e) => {
                const target = e.currentTarget as unknown as Measurable;
                target.measureInWindow((_x, y) =>
                  setFailed({
                    nonce,
                    lifted: { top: y, node: bubble(row, true) },
                  }),
                );
              }
            : undefined
        }
      >
        <Text selectable={!isFailed}>{content}</Text>
      </MessageBubble>
    );
  };

  const renderRow = ({ item: row }: { item: ChatRow }) =>
    row.kind === 'day' ? (
      <DateDivider label={dayText(t, row.day)} />
    ) : (
      bubble(row)
    );

  const empty = view.items.length === 0;
  let body: ReactNode;
  if (empty && view.loading) body = <SkeletonRows count={6} />;
  else if (empty && view.error)
    body = (
      <View style={styles.center}>
        <Icon as={CloudOff} size="hero" color="text-tertiary" />
        <Text color="text-secondary">{t('chat.loadFailed')}</Text>
        <Button
          variant="secondary"
          icon={RotateCw}
          label={t('chat.retry')}
          onPress={() => void view.reload().catch(() => {})}
        />
      </View>
    );
  else
    body = (
      <FlatList
        ref={list}
        inverted
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onEndReached={onTop}
        onEndReachedThreshold={0.5}
        // `scrolled-up`: new messages do not move what is being read; at the bottom they show.
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: AT_BOTTOM,
        }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          view.reachedStart || empty ? (
            <ChannelStart name={channelName} />
          ) : loadingOlder ? (
            <SkeletonRows count={2} />
          ) : undefined
        }
      />
    );

  const below = leftAt === null ? 0 : newBelow(view.items, leftAt, myId);
  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      {header}
      {belowHeader}
      <View style={styles.flex}>
        {body}
        {leftAt !== null && (
          <View style={styles.pill} pointerEvents="box-none">
            <JumpPill count={below} onPress={toBottom} />
          </View>
        )}
      </View>
      {aboveComposer}
      <Composer
        value={draft}
        onChangeText={(text) => drafts.set(channelId, text)}
        placeholder={placeholder}
        counter={count.counter}
        canSend={count.canSend}
        onSend={send}
        disabled={disabled}
      />
      <ActionSheet
        visible={failed !== null}
        cancel={false}
        lifted={failed?.lifted}
        onDismiss={() => setFailed(null)}
        groups={[
          {
            items: [
              {
                label: t('chat.resend'),
                icon: RotateCw,
                onPress: () => {
                  if (failed) void outbox.retry(failed.nonce).catch(() => {});
                  setFailed(null);
                },
              },
              {
                label: t('chat.deleteMessage'),
                icon: Trash2,
                destructive: true,
                onPress: () => {
                  if (failed) void outbox.discard(failed.nonce).catch(() => {});
                  setFailed(null);
                },
              },
            ],
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

// C-14 Skeleton rows of S-HOME-01 `loading`: avatar + two lines of different length.
function SkeletonRows({ count }: { count: number }) {
  return (
    <View style={styles.skeletons}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={40} height={40} round />
          <View style={styles.skeletonLines}>
            <Skeleton width={90} height={12} />
            <Skeleton width={240} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingVertical: space[2] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[3],
  },
  pill: {
    position: 'absolute',
    right: space[3],
    bottom: space[2],
  },
  skeletons: { flex: 1, justifyContent: 'flex-end', paddingBottom: space[2] },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  skeletonLines: { gap: space[2], justifyContent: 'center' },
});
