import { createStore } from 'zustand/vanilla';

// Why a server left my rail. `deleted`: the Owner deleted it ("{Server} đã bị xóa", SRV-05
// AC4); `deleted_here` (I am the Owner) and `left` (SRV-05 AC5) have no Dialog.
export type RemovalKind = 'kick' | 'ban' | 'deleted' | 'deleted_here' | 'left';

// The kinds with a Dialog (one "Đã hiểu").
export const hasRemovalDialog = (kind: RemovalKind) =>
  kind === 'kick' || kind === 'ban' || kind === 'deleted';

// 02 S-HOME-EDGE `kicked` / `banned` / `banned-in-room`, 03 S-ROOM-EDGE `kicked` (one Dialog,
// chốt 28/11/2026). Never says who did it (REQ-ROLE-05).
export type Removal = {
  serverId: string;
  serverName: string;
  action: RemovalKind;
  reason: string | null;
  minutes: number | null; // "{31 phút} đã học trong phiên học vẫn được tính.", from 1 minute
};

// `pending`: the event came; the app clears the server first (rail, screens, room, drafts)
// and only then shows the Dialog (`shown`), CR-17 #14.
export const removalStore = createStore<{
  pending: Removal | null;
  shown: Removal | null;
}>(() => ({ pending: null, shown: null }));

export const removalCleared = () =>
  removalStore.setState((s) => ({
    pending: null,
    shown:
      s.pending && hasRemovalDialog(s.pending.action) ? s.pending : s.shown,
  }));

export const dismissRemoval = () => removalStore.setState({ shown: null });

// `banned-in-room`: the line only for 1 minute or more of this Room Session.
export const studiedMinutes = (seconds: number | null) =>
  seconds !== null && seconds >= 60 ? Math.floor(seconds / 60) : null;

// AC7 `removed-while-offline`: unread kick / ban items never told on this device, told once.
export type RemovedItem = { id: string; serverName: string };

export function offlineRemovalToast(
  items: readonly RemovedItem[],
  told: ReadonlySet<string>,
): {
  ids: string[];
  text: { kind: 'one'; server: string } | { kind: 'many'; count: number };
} | null {
  const fresh = items.filter((i) => !told.has(i.id));
  if (!fresh.length) return null;
  const servers = new Set(fresh.map((i) => i.serverName));
  return {
    ids: fresh.map((i) => i.id),
    text:
      servers.size === 1
        ? { kind: 'one', server: fresh[0]!.serverName }
        : { kind: 'many', count: servers.size },
  };
}
