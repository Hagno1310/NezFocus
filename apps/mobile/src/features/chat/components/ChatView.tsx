import { ArrowRight, CloudOff, RotateCw, Trash2 } from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ErrorCode } from '@nezfocus/shared';
import { useStore } from 'zustand';
import {
  chatRows,
  composerCount,
  contentOf,
  messageToSend,
  itemKey,
  newBelow,
  type ChatRow,
} from '../../../domain/messages/chatRows';
import { drafts } from '../../../domain/messages/drafts';
import {
  activeTrigger,
  encodeMentions,
  type PickedMention,
} from '../../../domain/messages/mentions';
import {
  linksOf,
  parseMessage,
  spokenText,
} from '../../../domain/messages/markdown';
import type { ChatItem } from '../../../domain/messages/messageStore';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import {
  BlockedLine,
  ChannelStart,
  DateDivider,
  JumpPill,
  MessageBubble,
  SystemLine,
  UnreadStrip,
  type MessageStatus,
} from '../../../shared/ui/Chat';
import { Composer, type ComposerBlock } from '../../../shared/ui/Composer';
import { Skeleton } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { MentionSuggest } from '../../../shared/ui/MentionSuggest';
import { MessageText } from '../../../shared/ui/MessageText';
import { ActionSheet, type Lifted } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useMe } from '../../me/hooks/useMe';
import { avatarUri } from '../../me/avatarUri';
import { lastActive } from '../../../domain/account/sessions';
import { useChannelMessages } from '../hooks/useChannelMessages';
import { useChannelReading } from '../hooks/useChannelReading';
import { useChatMentions } from '../hooks/useChatMentions';
import { useChatClock } from '../hooks/useChatClock';
import { useSendMessage } from '../hooks/useSendMessage';
import { dayText, timeText } from '../chatText';

const RATE_LIMITED = String(ErrorCode.RateLimited);

// Offset from the bottom (the list is inverted) under which the list counts as "at the bottom".
const AT_BOTTOM = 48;
const AVATAR = size.avatar[3];

type Measurable = {
  measureInWindow: (cb: (x: number, y: number) => void) => void;
};

type Author = { name: string; uri: string | null; deleted: boolean };

// S-HOME-01 body; header and the strips around it are slots so S-DM-02 (P2-B3.3, #116) reuses it.
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
  disabled?: ComposerBlock;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const me = useMe().data;
  const myId = me?.id ?? '';
  const { now, timeZone } = useChatClock();
  const view = useChannelMessages(channelId, serverId);
  const outbox = useSendMessage(channelId);

  const draft = useStore(drafts.state, (s) => s[channelId] ?? '');
  // Gotcha: setState in onSelectionChange makes Android drop the '' after ➤ (text piles up),
  // so suggestions follow the @ / # at the end of the text.
  // ponytail: an @ typed mid-text gets no suggestions; khi cần: theo con trỏ bằng ref.
  const trigger = activeTrigger(draft, draft.length);
  const mentions = useChatMentions(serverId, channelId, trigger);
  const [picked, setPicked] = useState<PickedMention[]>([]);
  const toSend = encodeMentions(messageToSend(draft), picked);

  // Newest row seen while at the bottom; null = at the bottom now.
  const [leftAt, setLeftAt] = useState<string | null>(null);
  const jumped = useRef(false);
  const reading = useChannelReading({
    channelId,
    items: view.items,
    myId,
    loading: view.loading,
    reachedStart: view.reachedStart,
    loadOlder: view.loadOlder,
    atBottom: leftAt === null,
    jumped,
  });

  // FRIEND-03 AC2: "Hiện" opens a folded run until the channel is left (this view unmounts).
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const rows = useMemo(
    () =>
      chatRows(view.items, {
        now,
        timeZone,
        myId,
        blocked: mentions.blocked,
        revealed,
        newFrom: reading.newFrom,
      }).reverse(),
    [
      view.items,
      now,
      timeZone,
      myId,
      mentions.blocked,
      revealed,
      reading.newFrom,
    ],
  );
  const lineAt = rows.findIndex((r) => r.kind === 'new');

  // REQ-MSG-08: "tự gửi lại sau N giây" counts down while a message waits out a 40029.
  const waiting = view.items.some(
    (i) => i.kind === 'outbox' && i.entry.lastError === RATE_LIMITED,
  );
  const [tick, setTick] = useState(Date.now);
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  const list = useRef<FlatList<ChatRow>>(null);
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

  // 02 › Thứ tự tin: opening with unread goes to the line, once. The list is inverted, so
  // viewPosition 1 puts the line at the top of the screen.
  const toLine = useCallback(
    (index: number, animated: boolean) =>
      list.current?.scrollToIndex({ index, viewPosition: 1, animated }),
    [],
  );
  useEffect(() => {
    if (jumped.current || lineAt < 0) return;
    jumped.current = true;
    toLine(lineAt, false);
  }, [lineAt, toLine]);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const onTop = () => {
    if (loadingOlder || view.reachedStart || !view.items.length) return;
    setLoadingOlder(true);
    void view
      .loadOlder()
      .catch(() => {})
      .finally(() => setLoadingOlder(false));
  };

  // Counted as sent: with the tokens, as the backend counts.
  const count = composerCount(toSend);
  const send = () => {
    if (!count.canSend) return;
    void outbox.send(toSend);
    drafts.set(channelId, '');
    setPicked([]);
    toBottom();
  };
  const pick = (key: string) => {
    if (!mentions.suggestion) return;
    const next = mentions.suggestion.pick(key, draft, draft.length);
    setPicked((p) => [...p, next.picked]);
    drafts.set(channelId, next.text);
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
    const a = row.item.message.author;
    return {
      name: a.display_name ?? a.username ?? t('ui.deletedUser'),
      uri: avatarUri(a.avatar, '128'),
      deleted: a.username === null,
    };
  };

  const statusOf = (item: ChatItem): MessageStatus | undefined => {
    if (item.kind !== 'outbox') return undefined;
    const { status, lastError, nextAttemptAt } = item.entry;
    if (status === 'failed' && lastError === RATE_LIMITED && nextAttemptAt)
      return {
        kind: 'failed',
        text: t('chat.rateLimited', {
          count: Math.max(1, Math.ceil((nextAttemptAt - tick) / 1000)),
        }),
      };
    return status === 'failed'
      ? { kind: 'failed', text: t('chat.failed') }
      : { kind: 'pending', offline: !online };
  };

  const bubble = (
    row: Extract<ChatRow, { kind: 'message' }>,
    lifted = false,
  ) => {
    const who = author(row);
    const blocks = parseMessage(contentOf(row.item));
    const message = row.item.kind === 'message' ? row.item.message : null;
    const mentionView = message ? mentions.viewOf(message) : undefined;
    const content = spokenText(blocks, t('chat.spoiler'), mentionView?.label);
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
        mention={!!message && mentions.concerns(message)}
        surface={lifted ? 'surface-2' : undefined}
        liftedTime={lifted ? row.time.time : undefined}
        actions={linksOf(blocks).map((url) => ({
          label: url,
          onPress: () => void Linking.openURL(url).catch(() => {}),
        }))}
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
        <MessageText content={contentOf(row.item)} mentions={mentionView} />
      </MessageBubble>
    );
  };

  const renderRow = ({ item: row }: { item: ChatRow }) => {
    switch (row.kind) {
      case 'day':
        return <DateDivider label={dayText(t, row.day)} />;
      case 'new':
        return <DateDivider label={t('chat.newLine')} tone="danger" />;
      case 'message':
        return bubble(row);
      case 'blocked':
        return (
          <BlockedLine
            text={t('chat.blocked', { count: row.count })}
            show={t('chat.showBlocked')}
            onShow={() => setRevealed((s) => new Set(s).add(row.key))}
          />
        );
      case 'system':
        return systemLine(row);
    }
  };

  // C-10 › Tin hệ thống, worded for the viewer in the app's language (CR-24).
  const systemLine = (row: Extract<ChatRow, { kind: 'system' }>) => {
    const m = row.message;
    if (m.type !== 'member_join') return null;
    const name =
      m.author.display_name ?? m.author.username ?? t('ui.deletedUser');
    const parts = t('chat.memberJoin', { name: '\u0000' }).split('\u0000');
    return (
      <SystemLine
        icon={ArrowRight}
        parts={[parts[0] ?? '', name, parts[1] ?? '']}
        time={timeText(t, row.time)}
        accessibilityLabel={`${t('chat.memberJoin', { name })}, ${timeText(t, row.time, true)}`}
      />
    );
  };

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
        viewabilityConfigCallbackPairs={reading.viewPairs}
        // Rows not laid out yet: go near by the average height, then try again.
        onScrollToIndexFailed={(info) => {
          list.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(() => toLine(info.index, false), 100);
        }}
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
      {reading.strip && (
        <UnreadStrip
          text={
            reading.strip.many || !reading.strip.from
              ? t('chat.unreadStripMany')
              : t('chat.unreadStrip', {
                  count: reading.strip.count,
                  time: timeText(
                    t,
                    lastActive(reading.strip.from, now, timeZone),
                  ),
                })
          }
          action={t('chat.markRead')}
          onJump={() =>
            lineAt >= 0 ? toLine(lineAt, true) : list.current?.scrollToEnd()
          }
          onMarkRead={reading.markRead}
        />
      )}
      <View style={styles.flex}>
        {body}
        {leftAt !== null && (
          <View style={styles.pill} pointerEvents="box-none">
            <JumpPill count={below} onPress={toBottom} />
          </View>
        )}
      </View>
      {aboveComposer}
      {mentions.suggestion && !disabled && (
        <MentionSuggest sections={mentions.suggestion.sections} onPick={pick} />
      )}
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
          <Skeleton width={AVATAR} height={AVATAR} round />
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
