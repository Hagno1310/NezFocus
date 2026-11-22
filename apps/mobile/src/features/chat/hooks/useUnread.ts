import { useMemo } from 'react';
import { useStore } from 'zustand';
import { messageRepository } from '../../../data/messages';
import { isUnread, totals, unreadStore } from '../../../domain/messages/unread';

// REQ-NOTIF-01 for one channel (or DM): ChannelRow, DMRow (P2-B3.3 #116).
export function useUnread(channelId: string) {
  const u = useStore(unreadStore, (s) => s[channelId]);
  return {
    unread: isUnread(u),
    mentions: u?.mentions ?? 0,
    lastRead: u?.lastRead ?? null,
    lastMessage: u?.lastMessage ?? null,
  };
}

// Rail per server, 💬 (dms), tab Home and the app icon (home).
export function useUnreadTotals() {
  const state = useStore(unreadStore);
  return useMemo(() => totals(state), [state]);
}

// v1.5 "Đánh dấu đã đọc": an ack to the newest message, same endpoint as reading.
export function markChannelRead(channelId: string) {
  const last = unreadStore.getState()[channelId]?.lastMessage;
  if (last) void messageRepository.ack(channelId, last).catch(() => {});
}
