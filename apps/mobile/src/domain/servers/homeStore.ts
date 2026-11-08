import { createStore } from 'zustand/vanilla';

export type OpenChannel = {
  serverId: string;
  serverName: string;
  channelId: string;
  channelName: string;
};

// The channel the Home tab shows. ponytail: the drawer (P1-A2.2 #59) takes this over and
// remembers the last channel per server.
export const homeStore = createStore<{ open: OpenChannel | null }>(() => ({
  open: null,
}));

export const openChannel = (open: OpenChannel) => homeStore.setState({ open });
