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
