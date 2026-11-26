import { createStore } from 'zustand/vanilla';
import type { VoiceTarget } from './voiceSession';

// S-ROOM-EDGE `other-device`: the room I was put out of, for its preview's Dialog.
export const voiceNotice = createStore<{ otherDevice: VoiceTarget | null }>(
  () => ({ otherDevice: null }),
);
