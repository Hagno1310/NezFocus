import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';
import { CycleConfig, FocusPhase } from './solo.contract.js';

// Paths are relative to /api/v1 (SRS 5.3 Study).
export const FocusSessionRoutes = {
  // REQ-STUDY-01 / 11 · POST StartFocusSessionRequest → 201 FocusSessionResponse · 40001, 40302 (focus_control
  // off or managers without MANAGE_STUDY_ROOMS, not in the room: CR-28 #38), 40401, 40903 (a session runs, or Solo without end_solo)
  start: (channelId: string) => `/channels/${channelId}/focus-session`,
  // PATCH FocusSessionAction → 200 FocusSessionResponse, `stop` → 204 · 40302, 40401, 40901 (ended)
  byId: (id: string) => `/focus-sessions/${id}`,
} as const;

export const StartFocusSessionRequest = z.object({
  cycle_config: CycleConfig,
  // REQ-STUDY-10 AC8: ends my Solo Session (joined_room) and starts this one in one transaction.
  end_solo: z.boolean().optional(),
});
export type StartFocusSessionRequest = z.infer<typeof StartFocusSessionRequest>;

export const FocusSessionAction = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['pause', 'resume', 'skip', 'stop']) }),
  z.object({ action: z.literal('config'), cycle_config: CycleConfig }),
]);
export type FocusSessionAction = z.infer<typeof FocusSessionAction>;
export type FocusSessionActionName = FocusSessionAction['action'];

export const RoomSessionStatus = z.enum(['running', 'paused']);
export type RoomSessionStatus = z.infer<typeof RoomSessionStatus>;

// SRS 8.2 focus_sessions.end_reason.
export const RoomEndReason = z.enum([
  'stopped',
  'empty_channel',
  'focus_disabled',
  'channel_deleted',
]);
export type RoomEndReason = z.infer<typeof RoomEndReason>;

// CR-28 #38: the receiver's own Participation, never someone else's seconds (REQ-STUDY-13).
export const FocusSessionMe = z.object({
  focused_seconds: z.number().int(), // credited in this session, every stay added up
  // Focus is running and I am counted from here on; null in a break or paused. Live total = focused_seconds + (now − counting_since).
  counting_since: z.iso.datetime().nullable(),
});
export type FocusSessionMe = z.infer<typeof FocusSessionMe>;

// REQ-STUDY-01 / SRS 7.3.6. Participants and an away Host come from the channel's voice_states (CR-28 #38).
export const FocusSessionState = z.object({
  id: SnowflakeId,
  channel_id: SnowflakeId,
  server_id: SnowflakeId,
  status: RoomSessionStatus,
  phase: FocusPhase,
  cycle_config: CycleConfig,
  next_cycle_config: CycleConfig.nullable(), // STUDY-11 AC6: takes over at the next phase
  focus_phases_done: z.number().int(),
  phase_ends_at: z.iso.datetime().nullable(), // running only
  paused_remaining_ms: z.number().int().nullable(), // paused only
  host_id: SnowflakeId.nullable(), // null = no Host (STUDY-11)
  started_at: z.iso.datetime(),
  // STUDY-11: "Bình đã tạm dừng"; null for the clock's own phase changes and in READY.
  last_action: z
    .object({
      by: SnowflakeId,
      action: z.enum(['start', 'pause', 'resume', 'skip', 'config']),
    })
    .nullable(),
  me: FocusSessionMe.nullable(), // null when I am not a Participant
});
export type FocusSessionState = z.infer<typeof FocusSessionState>;

// backend_time lets the app compute clock_offset (SRS 7.3.6 step 1).
export const FocusSessionResponse = z.object({
  focus_session: FocusSessionState,
  backend_time: z.iso.datetime(),
});
export type FocusSessionResponse = z.infer<typeof FocusSessionResponse>;

// FOCUS_SESSION_END. Today's minutes and streak arrive before it in STREAK_UPDATE (CR-28 #38).
export const FocusSessionEnd = z.object({
  id: SnowflakeId,
  channel_id: SnowflakeId,
  server_id: SnowflakeId,
  ended_at: z.iso.datetime(),
  end_reason: RoomEndReason,
  ended_by: SnowflakeId.nullable(), // null when it ended by itself
  focused_seconds: z.number().int().nullable(), // mine in the session; null when I never took part
});
export type FocusSessionEnd = z.infer<typeof FocusSessionEnd>;
