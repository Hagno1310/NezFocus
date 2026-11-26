import { useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import { messageStore } from '../../../data/messages';
import type { ChannelView } from '../../../domain/messages/messageStore';

const NONE: ChannelView = {
  serverId: null,
  items: [],
  loading: true,
  error: false,
  reachedStart: false,
  revealing: false,
};

// S-HOME-01: the channel's messages, cache first (7.3.2). Opening it fetches what is newer.
export function useChannelMessages(channelId: string, serverId: string | null) {
  useEffect(() => {
    void messageStore.open(channelId, serverId).catch(() => {});
  }, [channelId, serverId]);
  const view = useStore(messageStore.state, (s) => s.views[channelId] ?? NONE);
  const loadOlder = useCallback(
    () => messageStore.loadOlder(channelId),
    [channelId],
  );
  const reload = useCallback(
    () => messageStore.open(channelId, serverId),
    [channelId, serverId],
  );
  return { ...view, loadOlder, reload };
}
