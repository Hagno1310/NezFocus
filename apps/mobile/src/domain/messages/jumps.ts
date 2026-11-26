import { createStore } from 'zustand/vanilla';

// A message to bring into view once its channel shows (link, push P3-B5.3 #154): C-10
// `highlight` flashes `times`, placed a third from the top (CR-19 #2).
export type Jump = {
  channelId: string;
  messageId: string;
  times: 1 | 2;
  key: number; // a new jump to the same message flashes again
  landed?: boolean; // scrolled into place: only then it flashes, not while still moving
};

export const jumps = createStore<Jump | null>(() => null);

// A new key each time: the same message asked again flashes again.
export const requestJump = (jump: Omit<Jump, 'key'>) =>
  jumps.setState({ ...jump, key: Date.now() }, true);
