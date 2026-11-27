import { createStore } from 'zustand/vanilla';
import { selectServer } from '../servers/homeStore';
import type { VoiceTarget } from './voiceSession';

// S-ROOM-01 on screen: a Home root like a channel (CR-15), over the channel it was opened from,
// so leaving the room goes back to that channel. Opening a text channel or a DM closes it.
// `intent`: a "Vào" or "Rời phòng" pressed elsewhere (tab Học, MiniPlayer) that the room screen
// carries out with its own questions (S-ROOM-06, S-ROOM-05 `host-leave`).
// `visible`: the channel whose room screen is focused now (not under another tab).
export const voiceView = createStore<{
  open: VoiceTarget | null;
  intent: 'join' | 'leave' | null;
  visible: string | null;
}>(() => ({ open: null, intent: null, visible: null }));

// Every way into a room opens the preview (`not-joined`), never the room itself (VC-01).
export function openVoice(target: VoiceTarget) {
  selectServer(target.serverId);
  voiceView.setState({ open: target, intent: null });
}

export function enterRoom(target: VoiceTarget) {
  selectServer(target.serverId);
  voiceView.setState({ open: target, intent: 'join' });
}

export function askLeaveRoom(target: VoiceTarget) {
  selectServer(target.serverId);
  voiceView.setState({ open: target, intent: 'leave' });
}

export const clearVoiceIntent = () => voiceView.setState({ intent: null });

export const closeVoice = () =>
  voiceView.setState({ open: null, intent: null });
