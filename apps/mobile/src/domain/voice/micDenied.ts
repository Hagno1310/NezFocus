import { createStore } from 'zustand/vanilla';

// S-ROOM-EDGE `mic-denied`: Android refused the mic after a tap on Mic; the Banner and the Mic
// `no-permission` stay until the permission is back (voiceLifecycle checks on return).
export const micDenied = createStore<{ denied: boolean }>(() => ({
  denied: false,
}));
