import type { VoiceLeaveReason } from '@nezfocus/shared';

// In-process (DEC-14): who sat down in / got up from a voice room. Room Sessions follow them (REQ-STUDY-15).
export const VOICE_JOINED = 'voice.joined';
export const VOICE_LEFT = 'voice.left';

export type VoiceRoomMove = {
  userId: bigint;
  serverId: bigint;
  channelId: bigint;
  at: Date;
};

// away: the 3 minutes away ran out (STUDY-15 AC2 counts to the last heartbeat, not to now).
export type VoiceLeft = VoiceRoomMove & {
  reason: VoiceLeaveReason;
  away: boolean;
};
