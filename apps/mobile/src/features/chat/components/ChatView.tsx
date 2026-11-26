import {
  ArrowRight,
  CloudOff,
  Pin,
  RotateCw,
  SendHorizontal,
  Trash2,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  CANNOT_MESSAGE_TEXT,
  ErrorCode,
  type MessageAuthor,
  type MessageResponse,
  type ServerMember,
} from '@nezfocus/shared';
import { useIsFocused } from '@react-navigation/native';
import { useStore } from 'zustand';
import {
  bottomAnchor,
  chatRows,
  composerCount,
  contentOf,
  messageToSend,
  newBelow,
  type ChatRow,
} from '../../../domain/messages/chatRows';
import { drafts } from '../../../domain/messages/drafts';
import {
  activeTrigger,
  decodeMentions,
  encodeMentions,
  type PickedMention,
} from '../../../domain/messages/mentions';
import { jumps } from '../../../domain/messages/jumps';
import { messageSheet } from '../../../domain/messages/messageActions';
import {
  linksOf,
  parseMessage,
  spokenText,
} from '../../../domain/messages/markdown';
import type { ChatItem } from '../../../domain/messages/messageStore';
import { FILE_BLOCKED } from '../../../domain/messages/outbox';
import { AttachmentTray } from '../../../shared/ui/AttachmentTray';
import { PhotoSourceSheet } from '../../media/PhotoSourceSheet';
import { useAttachmentTray } from '../hooks/useAttachmentTray';
import { useChatImages } from '../hooks/useChatImages';
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
import {
  Composer,
  type ComposerBlock,
  type ComposerContext,
} from '../../../shared/ui/Composer';
import { Skeleton } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { MentionSuggest } from '../../../shared/ui/MentionSuggest';
import { MessageText } from '../../../shared/ui/MessageText';
import { ActionSheet, type Lifted } from '../../../shared/ui/Overlay';
import { ReactionChips, ReplyLine } from '../../../shared/ui/Reactions';
import { Text } from '../../../shared/ui/Text';
import { showToast, useToastAnchor } from '../../../shared/ui/Toast';
import { exitMs } from '../../../shared/ui/transitions';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useMe } from '../../me/hooks/useMe';
import { avatarUri } from '../../me/avatarUri';
import { lastActive } from '../../../domain/account/sessions';
import { useChannelAbilities } from '../hooks/useCanSend';
import { useChannelMessages } from '../hooks/useChannelMessages';
import { useLinkChips } from '../hooks/useLinkChips';
import { useMessageJump } from '../hooks/useMessageJump';
import { useMessageActions } from '../hooks/useMessageActions';
import { MessageSheets } from './MessageSheets';
import { useChannelReading } from '../hooks/useChannelReading';
import { useChatMentions } from '../hooks/useChatMentions';
import { useChatClock } from '../hooks/useChatClock';
import { useSendMessage } from '../hooks/useSendMessage';
import { dayText, timeText } from '../chatText';
import { openMemberProfile } from '../../../domain/friends/profileSheet';

const RATE_LIMITED = String(ErrorCode.RateLimited);
const CANNOT_MESSAGE = String(ErrorCode.CannotMessageUser);

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
  start,
  composer,
  hideBlocked = false,
  people,
  onCannotMessage,
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
  // S-DM-02: the DM start block, a strip in place of the Composer (`blocked-by-me`),
  // messages of people I blocked hidden (FRIEND-03), the DM's people for @.
  start?: ReactElement;
  composer?: ReactNode;
  hideBlocked?: boolean;
  people?: readonly ServerMember[];
  onCannotMessage?: () => void; // a send answered 40303: S-DM-EDGE `blocked-mid-chat`
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const me = useMe().data;
  const myId = me?.id ?? '';
  const { now, timeZone } = useChatClock();
  const view = useChannelMessages(channelId, serverId);
  const outbox = useSendMessage(channelId);
  const actions = useMessageActions(channelId, serverId, beginContext);
  const abilities = useChannelAbilities(serverId, channelId);
  const linkChips = useLinkChips(serverId);
  const tray = useAttachmentTray(channelId);
  const [composerHeight, setComposerHeight] = useState(0);
  useToastAnchor(useIsFocused() ? composerHeight : 0);
  const images = useChatImages();
  const viewer = {
    inDm: !serverId,
    canManage: abilities.canManage,
    canReact: abilities.canReact,
    timedOut: abilities.timedOut,
    online,
  };
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const draft = useStore(drafts.state, (s) => s[channelId] ?? '');
  // Gotcha: setState in onSelectionChange makes Android drop the '' after ➤ (text piles up),
  // so suggestions follow the @ / # at the end of the text.
  // ponytail: an @ typed mid-text gets no suggestions; khi cần: theo con trỏ bằng ref.
  const trigger = activeTrigger(draft, draft.length);
  const mentions = useChatMentions(serverId, channelId, trigger, people);
  const [picked, setPicked] = useState<PickedMention[]>([]);
  const toSend = encodeMentions(messageToSend(draft), picked);

  // Newest row seen while at the bottom; null = at the bottom now.
  const [leftAt, setLeftAt] = useState<string | null>(null);
  const reading = useChannelReading({
    channelId,
    items: view.items,
    myId,
    loading: view.loading,
    reachedStart: view.reachedStart,
    loadOlder: view.loadOlder,
    atBottom: leftAt === null,
  });

  // FRIEND-03 AC2: "Hiện" opens a folded run until the channel is left (this view unmounts).
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const rows = useMemo(
    () =>
      chatRows(
        hideBlocked
          ? view.items.filter(
              (i) =>
                i.kind !== 'message' ||
                !mentions.blocked.has(i.message.author.id),
            )
          : view.items,
        {
          now,
          timeZone,
          myId,
          blocked: mentions.blocked,
          revealed,
          newFrom: reading.newFrom,
        },
      ).reverse(),
    [
      hideBlocked,
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

  const refused = view.items.some(
    (i) => i.kind === 'outbox' && i.entry.lastError === CANNOT_MESSAGE,
  );
  useEffect(() => {
    if (refused) onCannotMessage?.();
  }, [refused, onCannotMessage]);

  const list = useRef<FlatList<ChatRow>>(null);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const away = e.nativeEvent.contentOffset.y > AT_BOTTOM;
    if (!away && leftAt !== null) setLeftAt(null);
    if (away && leftAt === null) setLeftAt(bottomAnchor(view.items));
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
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || lineAt < 0) return;
    jumped.current = true;
    // Opened at a message (link, push): that message, not the line (frame `message-link`).
    if (jumps.getState()?.channelId === channelId) return;
    toLine(lineAt, false);
  }, [lineAt, toLine, channelId]);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const onTop = () => {
    if (loadingOlder || view.reachedStart || !view.items.length) return;
    setLoadingOlder(true);
    void view
      .loadOlder()
      .catch(() => {})
      .finally(() => setLoadingOlder(false));
  };

  // S-HOME-04 for this viewer; the a11y actions offer the same rows.
  const sheetOf = (m: MessageResponse) =>
    messageSheet(
      {
        mine: m.author.id === myId,
        system: m.type !== 'default',
        hasText: m.content.trim() !== '',
        pinned: m.pinned_at !== null,
      },
      viewer,
    );

  function nameOf(a: MessageAuthor) {
    if (a.id === myId) return me?.display_name ?? me?.username ?? '';
    return a.display_name ?? a.username ?? t('ui.deletedUser');
  }

  // S-HOME-01 `reply-mode` / `edit-mode`. Editing borrows the composer: the draft typed before
  // comes back when the edit ends.
  const context = actions.context;
  const before = useRef<{ text: string; picked: PickedMention[] } | null>(null);
  // Hoisted: useMessageActions calls it from the sheet's rows, after this render.
  function beginContext(kind: 'reply' | 'edit', message: MessageResponse) {
    // `reply-mode` / `edit-mode`: keyboard open. Focus once the sheet has gone, or Android
    // keeps the keyboard down behind the closing Modal.
    setTimeout(() => input.current?.focus(), exitMs + 50);
    if (kind !== 'edit') {
      // From editing straight to a reply: the draft typed before comes back first.
      if (before.current) {
        drafts.set(channelId, before.current.text);
        setPicked(before.current.picked);
        before.current = null;
      }
      return;
    }
    before.current ??= {
      text: drafts.state.getState()[channelId] ?? '',
      picked,
    };
    const shown = decodeMentions(message.content, (n) =>
      mentions.viewOf(message).label({ t: 'mention', ...n }),
    );
    drafts.set(channelId, shown.text);
    setPicked(shown.picked);
  }
  const endContext = () => {
    if (context?.kind === 'edit' && before.current) {
      drafts.set(channelId, before.current.text);
      setPicked(before.current.picked);
      before.current = null;
    }
    actions.endContext();
  };
  // 02 edge cases: the message being answered or edited was deleted meanwhile.
  const contextGone =
    !!context &&
    !view.items.some(
      (i) => i.kind === 'message' && i.message.id === context.message.id,
    );
  const editGone = useEffectEvent(() => {
    endContext();
    showToast({ message: t('chat.messageDeleted') });
  });
  const editingGone = contextGone && context?.kind === 'edit';
  useEffect(() => {
    if (editingGone) editGone();
  }, [editingGone]);

  // Counted as sent: with the tokens, as the backend counts.
  const count = composerCount(toSend);
  const editing = context?.kind === 'edit' ? context.message : null;
  const send = () => {
    if (editing) {
      // `edit-mode`: "Lưu rỗng → hỏi xóa tin".
      if (!toSend.trim()) return actions.askDelete({ message: editing });
      if (!count.canSend) return;
      const id = editing.id;
      endContext();
      actions.saveEdit(id, toSend);
      return;
    }
    // MSG-01 AC2: text or images; never over 2000 characters.
    if (count.counter?.kind === 'over') return;
    if (!count.canSend && !tray.hasFiles) return;
    const files = tray.take();
    if (!files) return; // C-11 "Gỡ hoặc thử lại tệp lỗi để gửi"
    void outbox.send(
      toSend,
      context?.kind === 'reply' ? context.message.id : undefined,
      files,
    );
    if (context) actions.endContext();
    drafts.set(channelId, '');
    setPicked([]);
    toBottom();
  };
  const composerContext: ComposerContext | undefined = context
    ? context.kind === 'edit'
      ? { text: t('chat.editing'), edit: true, onClose: endContext }
      : contextGone
        ? { text: t('chat.replyingDeleted'), onClose: endContext }
        : {
            text: t('chat.replyingTo'),
            name: nameOf(context.message.author),
            onClose: endContext,
          }
    : undefined;

  const { target, jumpTo, onScrollFailed } = useMessageJump(
    channelId,
    rows,
    list,
    view.loading,
  );
  const pick = (key: string) => {
    if (!mentions.suggestion) return;
    const next = mentions.suggestion.pick(key, draft, draft.length);
    setPicked((p) => [...p, next.picked]);
    drafts.set(channelId, next.text);
  };

  const [failed, setFailed] = useState<{
    nonce: string;
    lifted: Lifted;
    fileBlocked: boolean;
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
    // FRIEND-03 AC1 / S-DM-EDGE `blocked-mid-chat`: the one sentence, no "Thử lại".
    if (status === 'failed' && lastError === CANNOT_MESSAGE)
      return { kind: 'failed', text: CANNOT_MESSAGE_TEXT };
    // C-10 `failed · file-blocked` (CR-19 #7): no "Thử lại", tap → S-HOME-04.
    if (status === 'failed' && lastError === FILE_BLOCKED)
      return {
        kind: 'failed',
        text: t('chat.fileBlocked', {
          count: item.entry.attachments.filter((a) => a.blocked).length,
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
    const pictures = images.imagesOf(row.item);
    const spoken = spokenText(blocks, t('chat.spoiler'), mentionView?.label);
    const content = [
      spoken,
      pictures.length ? t('chat.a11yImages', { count: pictures.length }) : '',
    ]
      .filter(Boolean)
      .join(', ');
    const time = timeText(t, row.time);
    const status = statusOf(row.item);
    const isFailed = status?.kind === 'failed';
    const nonce = row.item.kind === 'outbox' ? row.item.entry.nonce : null;
    const replyTo =
      message?.reply_to_id ??
      (row.item.kind === 'outbox' ? row.item.entry.replyToId : null);
    const original =
      message?.referenced_message ??
      (replyTo
        ? view.items.find(
            (i): i is Extract<ChatItem, { kind: 'message' }> =>
              i.kind === 'message' && i.message.id === replyTo,
          )?.message
        : undefined);
    const sheet = message ? sheetOf(message) : null;
    const sheetOpens = sheet !== null;
    const openSheet = ({ top }: { top: number }) => {
      if (message)
        actions.open({ message, lifted: { top, node: bubble(row, true) } });
    };
    const chipsOff = !online || viewer.timedOut;
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
        onPressAuthor={() =>
          openMemberProfile(row.authorId, {
            serverId,
            fromTheirDm: !serverId,
          })
        }
        liftedTime={lifted ? row.time.time : undefined}
        reply={
          replyTo ? (
            <ReplyLine
              name={original ? nameOf(original.author) : null}
              text={original ? original.content : t('chat.replyDeleted')}
              onPress={
                original && !lifted ? () => jumpTo(original.id) : undefined
              }
            />
          ) : undefined
        }
        edited={message?.edited_at ? t('chat.edited') : undefined}
        reactions={
          message && message.reactions.length > 0 ? (
            <ReactionChips
              reactions={message.reactions}
              disabled={lifted || chipsOff}
              onToggle={(emoji) => actions.toggle(message, emoji)}
              onLongPress={(emoji) => actions.showReactors(message, emoji)}
              onAdd={
                viewer.inDm || viewer.canReact
                  ? () => actions.openPicker({ message })
                  : undefined
              }
            />
          ) : undefined
        }
        highlight={
          message && target?.landed && target.messageId === message.id
            ? { key: target.key, times: target.times }
            : undefined
        }
        actions={[
          ...linksOf(blocks).map((url) => ({
            label: url,
            onPress: () => void Linking.openURL(url).catch(() => {}),
          })),
          // C-10 a11y: what long-press offers, as actions.
          ...(message && sheet && !lifted
            ? [
                ...(sheet.rows.some((r) => r.row === 'reply')
                  ? [
                      {
                        label: t('chat.reply'),
                        onPress: () => actions.reply(message),
                      },
                    ]
                  : []),
                ...(sheet.reactions === 'on'
                  ? [
                      {
                        label: t('chat.addReaction'),
                        onPress: () => actions.openPicker({ message }),
                      },
                    ]
                  : []),
              ]
            : []),
        ]}
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
          isFailed &&
          nonce &&
          row.item.kind === 'outbox' &&
          row.item.entry.lastError !== CANNOT_MESSAGE
            ? (e) => {
                const target = e.currentTarget as unknown as Measurable;
                target.measureInWindow((_x, y) =>
                  setFailed({
                    nonce,
                    lifted: { top: y, node: bubble(row, true) },
                    fileBlocked:
                      row.item.kind === 'outbox' &&
                      row.item.entry.lastError === FILE_BLOCKED,
                  }),
                );
              }
            : undefined
        }
        // S-HOME-01 › Tương tác: long-press a sent message → S-HOME-04.
        onLongPress={message && sheetOpens && !lifted ? openSheet : undefined}
        images={
          pictures.length
            ? {
                items: pictures,
                // S-HOME-01 › Tương tác: an image → S-HOME-11 at it.
                onOpen: lifted
                  ? undefined
                  : (i) =>
                      images.open(
                        row.item,
                        i,
                        { name: who.name, avatarUri: who.uri },
                        time,
                      ),
                onError: images.onImageError,
              }
            : undefined
        }
      >
        <MessageText
          content={contentOf(row.item)}
          mentions={mentionView}
          links={linkChips}
        />
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
  const systemLine = (
    row: Extract<ChatRow, { kind: 'system' }>,
    lifted = false,
  ) => {
    const m = row.message;
    if (m.type !== 'member_join' && m.type !== 'channel_pinned') return null;
    const name =
      m.author.display_name ?? m.author.username ?? t('ui.deletedUser');
    // MSG-11: "Dũng đã tham gia server" · MSG-10: "Chi đã ghim một tin nhắn · Xem".
    const sentence =
      m.type === 'member_join' ? 'chat.memberJoin' : 'chat.pinned';
    const parts = t(sentence, { name: '\u0000' }).split('\u0000');
    // S-HOME-04 `system-message`: "Xóa tin nhắn" with MANAGE_MESSAGES, else no sheet (MSG-11).
    const opens = !lifted && sheetOf(m) !== null;
    return (
      <SystemLine
        icon={m.type === 'member_join' ? ArrowRight : Pin}
        parts={[parts[0] ?? '', name, parts[1] ?? '']}
        time={timeText(t, row.time)}
        action={
          m.type === 'channel_pinned' && !lifted
            ? {
                label: t('chat.pinnedSee'),
                onPress: () => jumpTo(m.system_data.message_id),
              }
            : undefined
        }
        accessibilityLabel={`${t(sentence, { name })}, ${timeText(t, row.time, true)}`}
        surface={lifted ? 'surface-2' : undefined}
        deleteLabel={t('chat.deleteMessage')}
        onLongPress={
          opens
            ? ({ top }) =>
                actions.open({
                  message: m,
                  lifted: { top, node: systemLine(row, true) },
                })
            : undefined
        }
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
          if (onScrollFailed(info)) return;
          list.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          // The rows may have changed meanwhile: an index past the end throws.
          setTimeout(() => {
            if (info.index < (list.current?.props.data?.length ?? 0))
              toLine(info.index, false);
          }, 100);
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
            (start ?? <ChannelStart name={channelName} />)
          ) : loadingOlder || view.revealing ? (
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
      {/* S-MOD-04 › Vị trí toast: the composer is a bottom bar too (frame `too-many`). */}
      <View onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}>
        {composer ?? (
          <Composer
            value={draft}
            onChangeText={(text) => drafts.set(channelId, text)}
            placeholder={placeholder}
            counter={count.counter}
            canSend={
              count.canSend ||
              (!!editing && !toSend.trim()) ||
              (!editing && tray.hasFiles && count.counter?.kind !== 'over')
            }
            onSend={send}
            disabled={disabled}
            context={composerContext}
            onEmoji={actions.openComposerPicker}
            // C-11 `no-attach`: no ATTACH_FILES, no `+`; an edit keeps its images (MSG-05).
            onAttach={
              abilities.canAttach && !editing ? tray.openPicker : undefined
            }
            above={
              editing ? undefined : (
                <AttachmentTray
                  tiles={tray.tiles}
                  line={tray.line}
                  onRemove={tray.remove}
                  onRetry={tray.retry}
                />
              )
            }
            inputRef={input}
          />
        )}
      </View>
      {/* S-HOME-05 `picking`: "Ảnh" (photo picker, images only) · "Chụp ảnh" (CR-28). */}
      <PhotoSourceSheet
        visible={tray.picking}
        title={t('chat.attachTitle')}
        labels={{ pick: t('chat.attachPhoto'), take: t('chat.attachCamera') }}
        cameraBody={t('chat.attachCameraBody')}
        onPhotos={tray.add}
        onDismiss={tray.closePicker}
      />
      {images.viewer}
      <MessageSheets
        actions={actions}
        sheetOf={sheetOf}
        nameOf={nameOf}
        timeOf={(m) => timeText(t, lastActive(m.created_at, now, timeZone))}
        onInsert={(emoji) => drafts.set(channelId, `${draft}${emoji}`)}
      />
      <ActionSheet
        visible={failed !== null}
        cancel={false}
        lifted={failed?.lifted}
        onDismiss={() => setFailed(null)}
        groups={[
          {
            items: [
              // S-HOME-04 `failed-file-blocked` (CR-19 #7) or `failed-message`.
              failed?.fileBlocked
                ? {
                    label: t('chat.sendWithoutBlocked'),
                    icon: SendHorizontal,
                    onPress: () => {
                      void outbox
                        .sendWithoutBlocked(failed.nonce)
                        .catch(() => {});
                      setFailed(null);
                    },
                  }
                : {
                    label: t('chat.resend'),
                    icon: RotateCw,
                    onPress: () => {
                      if (failed)
                        void outbox.retry(failed.nonce).catch(() => {});
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
