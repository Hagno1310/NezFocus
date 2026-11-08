import type { DispatchEvent, ServerResponse } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import {
  emptyHome,
  reduceHome,
  type HomeState,
  type OpenChannel,
} from './drawer';

export type { OpenChannel };

// The Home tab: the drawer's servers and channels, and the channel on screen (S-HOME-02).
export const homeStore = createStore<HomeState>(() => emptyHome);

// Opening a channel also shows its server in the drawer.
export const openChannel = (open: OpenChannel) =>
  homeStore.setState({ open, selectedServerId: open.serverId });

export const selectServer = (serverId: string) =>
  homeStore.setState({ selectedServerId: serverId });

export const setChannels = (
  serverId: string,
  channels: ServerResponse['channels'],
) =>
  homeStore.setState((s) => ({
    channels: { ...s.channels, [serverId]: channels },
  }));

export const setCollapsed = (serverId: string, categoryIds: string[]) =>
  homeStore.setState((s) => ({
    collapsed: { ...s.collapsed, [serverId]: categoryIds },
  }));

export const toggleCategory = (serverId: string, categoryId: string) => {
  const ids = homeStore.getState().collapsed[serverId] ?? [];
  setCollapsed(
    serverId,
    ids.includes(categoryId)
      ? ids.filter((id) => id !== categoryId)
      : [...ids, categoryId],
  );
};

// Returns the name of the open channel when the event took it away (`channel-removed`).
export function applyGatewayEvent(event: DispatchEvent): string | undefined {
  const { state, removed } = reduceHome(homeStore.getState(), event);
  homeStore.setState(state, true);
  return removed;
}

// A server just created here shows up before its SERVER_CREATE arrives.
export const addServer = (server: ServerResponse) =>
  applyGatewayEvent({ t: 'SERVER_CREATE', d: server, s: 0 });

export const resetHome = () => homeStore.setState(emptyHome, true);
