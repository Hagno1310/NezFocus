import { newerId } from './unread';

// SRS 7.3.3 "Đã đọc chỉ khi thật sự thấy": what was seen is gathered for 1 s, then one ack
// per channel for the newest message (also once when coming back to the foreground).
export function createAckBatcher({
  send,
  setTimer,
  delayMs = 1000,
}: {
  send: (channelId: string, messageId: string) => void;
  setTimer: (fn: () => void, ms: number) => () => void;
  delayMs?: number;
}) {
  const waiting = new Map<string, string>();
  let cancelTimer: (() => void) | null = null;

  const flush = () => {
    cancelTimer = null;
    for (const [channelId, messageId] of waiting) send(channelId, messageId);
    waiting.clear();
  };

  return {
    // `lastRead`: what the channel already has read; nothing older is sent.
    seen(channelId: string, messageId: string, lastRead: string | null) {
      if (
        !newerId(messageId, waiting.get(channelId)) ||
        !newerId(messageId, lastRead)
      )
        return;
      waiting.set(channelId, messageId);
      cancelTimer ??= setTimer(flush, delayMs);
    },
    cancel() {
      cancelTimer?.();
      cancelTimer = null;
      waiting.clear();
    },
  };
}

// FlatList's `maintainVisibleContentPosition` holds viewability callbacks until a scroll event,
// and at the bottom none comes: what arrives there, or is there on coming back, is on screen.
export function seenAtBottom(
  before: { newestId: string | null; canAck: boolean },
  now: {
    newestId: string | null;
    canAck: boolean;
    atBottom: boolean;
    loading: boolean;
    settled: boolean; // opened with unread: the list has gone to the line (02 › Thứ tự tin)
  },
): string | null {
  if (!now.atBottom || !now.canAck || now.loading || !now.settled) return null;
  // No newest before = the first page: opening goes to the line, viewability acks from there.
  if (!now.newestId || !before.newestId) return null;
  return now.newestId !== before.newestId || !before.canAck
    ? now.newestId
    : null;
}
