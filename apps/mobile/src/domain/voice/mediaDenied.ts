import { createStore } from 'zustand/vanilla';

// Android refused the mic / camera after a tap: Mic / Camera `no-permission` (C-17) and, for the
// mic, S-ROOM-EDGE `mic-denied`, until the permission is back (voiceLifecycle checks on return).
export const mediaDenied = createStore<{ mic: boolean; camera: boolean }>(
  () => ({ mic: false, camera: false }),
);
