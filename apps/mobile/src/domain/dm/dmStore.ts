import type { DmChannel } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import type { DmRepository } from './DmRepository';
import { closeDm, emptyDms, type DmState } from './dms';

export const dmStore = createStore<DmState>(() => emptyDms);

// Home tab: 💬 shows S-DM-01 in the left drawer; `open` is the DM on screen (S-DM-02).
export type DmView = { listShown: boolean; open: string | null };
export const dmView = createStore<DmView>(() => ({
  listShown: false,
  open: null,
}));

export const showDmList = () => dmView.setState({ listShown: true });
export const hideDmList = () => dmView.setState({ listShown: false });
export const showDm = (channelId: string) =>
  dmView.setState({ open: channelId, listShown: true });

const upsert = (dm: DmChannel) =>
  dmStore.setState((s) => ({ ...s, byId: { ...s.byId, [dm.id]: dm } }));

export const dmWith = (userId: string) =>
  Object.values(dmStore.getState().byId).find((d) => d.recipient.id === userId);

export function createDmActions(repo: DmRepository) {
  return {
    // REQ-DM-03: the pair's one DM; POST also reopens it if I had closed it.
    async openWith(userId: string) {
      const dm = await repo.open(userId);
      upsert(dm);
      showDm(dm.id);
      return dm;
    },
    // CR-28: hidden on my side only, until a new message.
    async close(channelId: string) {
      await repo.close(channelId);
      dmStore.setState((s) => closeDm(s, channelId));
      if (dmView.getState().open === channelId) dmView.setState({ open: null });
    },
  };
}
