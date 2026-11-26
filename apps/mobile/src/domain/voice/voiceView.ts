import { createStore } from 'zustand/vanilla';
import { selectServer } from '../servers/homeStore';
import type { VoiceTarget } from './voiceSession';

// S-ROOM-01 on screen: a Home root like a channel (CR-15), over the channel it was opened from,
// so leaving the room goes back to that channel. Opening a text channel or a DM closes it.
export const voiceView = createStore<{ open: VoiceTarget | null }>(() => ({
  open: null,
}));

// Every way into a room opens the preview (`not-joined`), never the room itself (VC-01).
export function openVoice(target: VoiceTarget) {
  selectServer(target.serverId);
  voiceView.setState({ open: target });
}

export const closeVoice = () => voiceView.setState({ open: null });
