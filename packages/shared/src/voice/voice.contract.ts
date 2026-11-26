import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Voice, CR-28 #30).
export const VoiceRoutes = {
  // REQ-VC-01, DEC-33 · POST VoiceTokenRequest → VoiceTokenResponse · 40001, 40302 (no CONNECT,
  // timed out), 40401 (channel not viewable / not voice; call_id until P3-B6.2 #156), 50301
  token: '/voice/token',
  // SRS 5.5 · LiveKit webhook, signed (Authorization), no user auth
  webhook: '/voice/webhook',
} as const;

// SRS 5.5: room name of a voice channel and of a 1-1 call.
export const voiceRoomName = (
  to: { channel_id: string } | { call_id: string },
) => ('channel_id' in to ? `voice:${to.channel_id}` : `call:${to.call_id}`);

export const VoiceTokenRequest = z
  .object({
    channel_id: SnowflakeId.optional(),
    call_id: SnowflakeId.optional(),
  })
  .refine((b) => (b.channel_id === undefined) !== (b.call_id === undefined), {
    message: 'exactly one of channel_id, call_id',
  });
export type VoiceTokenRequest = z.infer<typeof VoiceTokenRequest>;

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

// DISPATCH VOICE_STATE_UPDATE and READY.voice_states: to who can VIEW_CHANNEL it.
export const VoiceState = z.object({
  user_id: SnowflakeId,
  channel_id: SnowflakeId.nullable(), // null = left
  server_id: SnowflakeId,
  self_mute: z.boolean(),
  self_video: z.boolean(),
  mod_muted: z.boolean(), // server_members.mod_muted (REQ-VC-04 AC5)
  joined_at: z.iso.datetime().nullable(),
  away: z.boolean(), // lost connection, seat kept ≤ 3 minutes (VC-01, C-07 `away`)
  reason: VoiceLeaveReason.optional(), // only on the leaver's own copy
});
export type VoiceState = z.infer<typeof VoiceState>;

// PATCH /servers/:id/members/:userId/voice (MemberRoutes.voice) · 204 · 40001, 40301 (role at or
// above own highest; the Owner), 40302 (MUTE_MEMBERS / MOVE_MEMBERS in their room). Not in a
// voice room of the server → 204, nothing done.
export const MemberVoiceRequest = z
  .object({
    mute: z.boolean().optional(),
    disconnect: z.literal(true).optional(),
  })
  .refine((b) => b.mute !== undefined || b.disconnect !== undefined, {
    message: 'mute or disconnect',
  });
export type MemberVoiceRequest = z.infer<typeof MemberVoiceRequest>;
