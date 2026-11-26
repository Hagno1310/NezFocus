import { createStore } from 'zustand/vanilla';

// The tray of each channel (C-29): upload keys in the order picked. Kept like the draft when
// leaving the channel, gone when the app quits (C-11).
export const trays = createStore<Record<string, readonly string[]>>(() => ({}));

export const trayOf = (channelId: string) => trays.getState()[channelId] ?? [];

export function setTray(channelId: string, keys: readonly string[]) {
  trays.setState({ [channelId]: keys });
}
