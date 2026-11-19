import { createStore } from 'zustand/vanilla';

// S-HOME-07 is one sheet for the Home tab: opened from "Mời bạn" (S-HOME-02 / S-HOME-09)
// or right after a server is created (S-HOME-06 `created`). `serverId` stays after closing so
// the sheet can animate out; `opening` starts each opening from scratch.
export const inviteSheetStore = createStore<{
  serverId: string | null;
  open: boolean;
  opening: number;
}>(() => ({ serverId: null, open: false, opening: 0 }));

export const openInviteSheet = (serverId: string) =>
  inviteSheetStore.setState((s) => ({
    serverId,
    open: true,
    opening: s.opening + 1,
  }));
export const closeInviteSheet = () =>
  inviteSheetStore.setState({ open: false });
