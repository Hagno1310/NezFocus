import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageRepository } from '../../../data/messages';
import {
  createAckBatcher,
  seenAtBottom,
} from '../../../domain/messages/ackBatcher';
import type { ChatRow } from '../../../domain/messages/chatRows';
import type { ChatItem } from '../../../domain/messages/messageStore';
import {
  firstUnread,
  isUnread,
  newerId,
  unreadStore,
} from '../../../domain/messages/unread';
import { markChannelRead } from './useUnread';
import { useReadTracking } from './useReadTracking';

// Chốt 22/11/2026: back to the last read, at most 100 messages (two pages).
const MAX_PAGES_BACK = 1;
const NEVER_READ = '0';

// A folded run of blocked messages is seen through its newest one.
const idOf = (r: ChatRow) =>
  r.kind === 'system'
    ? r.message.id
    : r.kind === 'blocked'
      ? r.lastId
      : r.kind === 'message' && r.item.kind === 'message'
        ? r.item.message.id
        : null;

const lastReadOf = (channelId: string) =>
  unreadStore.getState()[channelId]?.lastRead ?? null;

// Where the line was when the channel opened (null = nothing unread then).
const anchorOf = (channelId: string) => {
  const u = unreadStore.getState()[channelId];
  return isUnread(u) ? (u!.lastRead ?? NEVER_READ) : null;
};

// REQ-NOTIF-01 in an open channel: the "Tin nhắn mới" line, the `new-messages` strip, and
// acks only for what is really seen (SRS 7.3.3).
export function useChannelReading({
  channelId,
  items,
  myId,
  loading,
  reachedStart,
  loadOlder,
  atBottom,
}: {
  channelId: string;
  items: readonly ChatItem[];
  myId: string;
  loading: boolean;
  reachedStart: boolean;
  loadOlder: () => Promise<void>;
  atBottom: boolean;
}) {
  const { active, canAck } = useReadTracking();
  // The line stays where it was until the channel is left (02 › Đã đọc)…
  const [anchor, setAnchor] = useState(() => anchorOf(channelId));
  // S-HOME-01 `new-messages`: the strip shows while the line is off screen.
  const [dividerShown, setDividerShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const sent = useMemo(
    () =>
      items.flatMap((i) =>
        i.kind === 'message'
          ? [
              {
                id: i.message.id,
                authorId: i.message.author.id,
                at: i.message.created_at,
              },
            ]
          : [],
      ),
    [items],
  );
  const newFrom = anchor === null ? null : firstUnread(sent, anchor, myId);
  // The first unread is older than what is loaded.
  const before =
    anchor !== null &&
    !reachedStart &&
    !!sent[0] &&
    newerId(sent[0].id, anchor);

  // …except back in the foreground with new unread: it moves to the first of them.
  const wasActive = useRef(active);
  useEffect(() => {
    if (
      active &&
      !wasActive.current &&
      isUnread(unreadStore.getState()[channelId])
    ) {
      setAnchor(anchorOf(channelId));
      setDismissed(false);
    }
    wasActive.current = active;
  }, [active, channelId]);

  // Opening with unread further back than the first page: one more page (100 in all).
  const pagesBack = useRef(0);
  const [backDone, setBackDone] = useState(false);
  useEffect(() => {
    if (loading || !before || pagesBack.current >= MAX_PAGES_BACK) return;
    pagesBack.current++;
    void loadOlder()
      .catch(() => {})
      .finally(() => setBackDone(true));
  }, [loading, before, loadOlder]);
  // Still loading back: neither a count nor "99+" yet.
  const many = before && backDone;

  const acks = useMemo(
    () =>
      createAckBatcher({
        send: (c, m) => void messageRepository.ack(c, m).catch(() => {}),
        setTimer: (fn, ms) => {
          const id = setTimeout(fn, ms);
          return () => clearTimeout(id);
        },
      }),
    [],
  );
  useEffect(() => () => acks.cancel(), [acks]);

  const newestVisible = useRef<string | null>(null);
  const canAckNow = useRef(canAck);
  useEffect(() => {
    canAckNow.current = canAck;
    if (!canAck) return acks.cancel();
    // Back in front / drawer closed: one ack for what is on screen.
    if (newestVisible.current)
      acks.seen(channelId, newestVisible.current, lastReadOf(channelId));
  }, [canAck, acks, channelId]);

  const newestId = sent.at(-1)?.id ?? null;
  const shown = useRef({ newestId, canAck });
  useEffect(() => {
    const id = seenAtBottom(shown.current, {
      newestId,
      canAck,
      atBottom,
      loading,
    });
    shown.current = { newestId, canAck };
    if (id) acks.seen(channelId, id, lastReadOf(channelId));
  }, [newestId, canAck, atBottom, loading, acks, channelId]);

  // Seen = ≥ 50% shown, or (taller than the list) covering all of it: SRS 7.3.3.
  const onViewable = useCallback(
    (viewableItems: { item: ChatRow }[], tracksLine: boolean) => {
      let newest: string | null = null;
      if (tracksLine)
        setDividerShown(viewableItems.some((v) => v.item.kind === 'new'));
      for (const { item: r } of viewableItems) {
        const id = idOf(r);
        if (id && (!newest || newerId(id, newest))) newest = id;
      }
      if (tracksLine || newest) newestVisible.current = newest;
      if (newest && canAckNow.current)
        acks.seen(channelId, newest, lastReadOf(channelId));
    },
    [acks, channelId],
  );
  // FlatList `viewabilityConfigCallbackPairs`, which must never change after mount.
  const viewPairs = useMemo(
    () => [
      {
        viewabilityConfig: { itemVisiblePercentThreshold: 50 },
        onViewableItemsChanged: ({
          viewableItems,
        }: {
          viewableItems: { item: ChatRow }[];
        }) => onViewable(viewableItems, true),
      },
      {
        viewabilityConfig: { viewAreaCoveragePercentThreshold: 100 },
        onViewableItemsChanged: ({
          viewableItems,
        }: {
          viewableItems: { item: ChatRow }[];
        }) => onViewable(viewableItems, false),
      },
    ],
    [onViewable],
  );

  const unreadCount = newFrom
    ? sent.filter((m) => m.authorId !== myId && !newerId(newFrom, m.id)).length
    : 0;
  const strip =
    !dismissed && !dividerShown && (before ? backDone : newFrom !== null)
      ? {
          many,
          count: unreadCount,
          from: sent.find((m) => m.id === newFrom)?.at ?? null,
        }
      : null;

  return {
    newFrom,
    strip,
    viewPairs,
    markRead: () => {
      setDismissed(true);
      markChannelRead(channelId);
    },
  };
}
