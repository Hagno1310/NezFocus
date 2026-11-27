import type {
  VoiceLeaveReason,
  VoiceRoomMember,
  VoiceStateUpdate,
} from '@nezfocus/shared';

// Which rooms count: kicked from server S → only S's rooms; 'any' for logout / another device.
export type VoiceScope = { serverId: bigint } | { channelId: bigint } | 'any';
export type VoiceSeat = { serverId: bigint; channelId: bigint };
// Who is asking: a user on one login (an auth session = one device).
export type VoiceCaller = { userId: bigint; authSessionId: bigint };

// REQ-ROLE-05 AC4, SRV-05 AC5, VC-04. Owner: voice (B); kick / ban / timeout #126, leave #130.
export abstract class VoiceService {
  // Out of the room now (no 3-minute grace), `reason` to that device; false = not in scope.
  abstract disconnect(
    userId: bigint,
    scope: VoiceScope,
    reason: VoiceLeaveReason,
  ): Promise<boolean>;
  // CR-28 #32: everyone inside leaves with `channel_deleted`; viewers get CHANNEL_DELETE.
  abstract roomDeleted(serverId: bigint, channelId: bigint): Promise<void>;
  // The user's room (away included): "Bạn cũng sẽ rời {phòng}", the timeout sheet.
  abstract seatOf(userId: bigint): Promise<VoiceSeat | null>;
  // Who sits in a room, away seats included (REQ-STUDY-01: everyone in it is a Participant).
  abstract occupants(channelId: bigint): Promise<VoiceOccupant[]>;
}

export type VoiceOccupant = { userId: bigint; joinedAt: Date; away: boolean };

// What the Gateway needs from voice (WORKFLOW 4.3): op 4, READY, a login that ended.
export abstract class VoiceSessions {
  abstract update(who: VoiceCaller, d: VoiceStateUpdate): Promise<void>;
  abstract ready(userId: bigint): Promise<VoiceRoomMember[]>;
  abstract signedOut(authSessionId: bigint): Promise<void>;
}
