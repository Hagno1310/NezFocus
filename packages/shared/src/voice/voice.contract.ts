import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Voice, CR-28 #30).
export const VoiceRoutes = {
  // REQ-VC-01, DEC-33 · POST CreateVoiceTokenRequest → VoiceTokenResponse · 40001, 40302 (no
  // CONNECT, timed out), 40401 (channel not viewable / not voice; call_id until P3-B6.2 #156), 50301
  token: '/voice/token',
  // SRS 5.5 · LiveKit webhook, signed (Authorization), no user auth · 40100 (bad signature)
  webhook: '/voice/webhook',
} as const;

export const CreateVoiceTokenRequest = z
  .object({
    channel_id: SnowflakeId.optional(),
    call_id: SnowflakeId.optional(),
  })
  .refine((b) => (b.channel_id === undefined) !== (b.call_id === undefined), {
    message: 'exactly one of channel_id, call_id',
  });
export type CreateVoiceTokenRequest = z.infer<typeof CreateVoiceTokenRequest>;

// TTL 10 minutes, only needed to connect (SRS 5.5); ICE / TURN come from LiveKit itself.
export const VoiceTokenResponse = z.object({
  token: z.string(),
  url: z.string(), // wss://… of LiveKit
});
export type VoiceTokenResponse = z.infer<typeof VoiceTokenResponse>;

// Op 4, client → backend, after LiveKit connects, on every mic / camera change, and on leave.
// No self_deaf: self-deafen is v1.x (REQ-VC-04, CR-28 #30).
export const VoiceStateUpdate = z.object({
  channel_id: SnowflakeId.nullable(), // null = leave
  self_mute: z.boolean(),
  self_video: z.boolean(),
});
export type VoiceStateUpdate = z.infer<typeof VoiceStateUpdate>;

// Why I left, so the app picks the right Toast / Dialog (S-ROOM-05, S-ROOM-EDGE, S-SET-EDGE).
export const VoiceLeaveReason = z.enum([
  'left', // "Rời phòng", or the 3 minutes away ran out
  'switched', // "Chuyển sang phòng này": no "Đã rời …" Toast
  'disconnected_by_mod', // REQ-VC-04
  'kicked', // REQ-ROLE-05 AC4 (P3-A3.1 #126)
  'banned',
  'timed_out',
  'left_server', // REQ-SRV-05 AC5 (P3-A4.1 #130)
  'channel_deleted',
  'other_device', // one voice per account (VC-01), compared by device_id
  'call', // CR-06 #2: calling from a room leaves it (P3-B6 #30)
  'logout',
]);
export type VoiceLeaveReason = z.infer<typeof VoiceLeaveReason>;

// READY.voice_states: someone in a voice room I can VIEW_CHANNEL.
export const VoiceRoomMember = z.object({
  user_id: SnowflakeId,
  channel_id: SnowflakeId,
  server_id: SnowflakeId,
  self_mute: z.boolean(),
  self_video: z.boolean(),
  mod_muted: z.boolean(), // server_members.mod_muted (REQ-VC-04 AC5)
  joined_at: z.iso.datetime(),
  away: z.boolean(), // lost connection, seat kept ≤ 3 minutes (VC-01, C-07 `away`)
});
export type VoiceRoomMember = z.infer<typeof VoiceRoomMember>;

// DISPATCH VOICE_STATE_UPDATE, to who can VIEW_CHANNEL it: a seat, or a leave.
export const VoiceState = VoiceRoomMember.extend({
  channel_id: SnowflakeId.nullable(), // null = left
  joined_at: z.iso.datetime().nullable(),
  reason: VoiceLeaveReason.optional(), // only on the leaver's own copy
});
export type VoiceState = z.infer<typeof VoiceState>;

// PATCH MemberRoutes.voice. `mute` always writes server_members.mod_muted, in a room or not
// (AC5); `disconnect` of someone not in a room of the server does nothing.
export const UpdateMemberVoiceRequest = z
  .object({
    mute: z.boolean().optional(),
    disconnect: z.literal(true).optional(),
  })
  .refine((b) => b.mute !== undefined || b.disconnect !== undefined, {
    message: 'mute or disconnect',
  });
export type UpdateMemberVoiceRequest = z.infer<typeof UpdateMemberVoiceRequest>;
