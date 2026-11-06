import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// SRS 7.2 (v1.3): one cycle-config schema for Solo, Study Room defaults and Study Events.
export const CycleConfig = z
  .object({
    focus_min: z.number().int().min(5).max(120),
    short_break_min: z.number().int().min(1).max(30),
    long_break_min: z.number().int().min(5).max(60).optional(),
    long_break_every: z.number().int().min(2).max(8).optional(),
  })
  .refine(
    (c) =>
      (c.long_break_min === undefined) === (c.long_break_every === undefined),
    {
      path: ['long_break_every'],
      message: 'long_break_min and long_break_every go together',
    },
  );
export type CycleConfig = z.infer<typeof CycleConfig>;

// REQ-STUDY-10: a break that ends waits this long for "Học tiếp" before the session ends.
export const SOLO_WAIT_LIMIT_MS = 10 * 60_000;

export const FocusPhase = z.enum(['focus', 'short_break', 'long_break']);
export type FocusPhase = z.infer<typeof FocusPhase>;
export const SoloStatus = z.enum(['running', 'paused', 'waiting', 'ended']);
export type SoloStatus = z.infer<typeof SoloStatus>;
export const SoloEndReason = z.enum(['stopped', 'wait_timeout', 'joined_room']);
export type SoloEndReason = z.infer<typeof SoloEndReason>;

export const SoloSession = z.object({
  id: SnowflakeId,
  status: SoloStatus,
  phase: FocusPhase,
  cycle_config: CycleConfig,
  next_cycle_config: CycleConfig.nullable(),
  focus_phases_done: z.number().int(),
  phase_ends_at: z.iso.datetime().nullable(), // running only
  paused_remaining_ms: z.number().int().nullable(), // paused only
  waiting_since: z.iso.datetime().nullable(), // waiting: the break ended here; ends SOLO_WAIT_LIMIT_MS later
  started_at: z.iso.datetime(),
  ended_at: z.iso.datetime().nullable(),
  end_reason: SoloEndReason.nullable(),
  focused_seconds: z.number().int(),
  // Seconds this session credited per local day, and whether the 16 h cap cut some (S-STUDY-EDGE midnight, long-session).
  days: z.array(
    z.object({ local_date: z.iso.date(), focused_seconds: z.number().int() }),
  ),
  hit_daily_cap: z.boolean(),
});
export type SoloSession = z.infer<typeof SoloSession>;

// backend_time lets the app compute clock_offset (SRS 7.3.6 step 1).
export const SoloSessionResponse = z.object({
  solo_session: SoloSession,
  backend_time: z.iso.datetime(),
});
export type SoloSessionResponse = z.infer<typeof SoloSessionResponse>;

export const CurrentSoloSessionResponse = z.object({
  solo_session: SoloSession.nullable(),
  backend_time: z.iso.datetime(),
});
export type CurrentSoloSessionResponse = z.infer<
  typeof CurrentSoloSessionResponse
>;

export const StartSoloSessionRequest = z.object({ cycle_config: CycleConfig });
export type StartSoloSessionRequest = z.infer<typeof StartSoloSessionRequest>;

export const SoloAction = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['pause', 'resume', 'skip', 'continue', 'stop']) }),
  z.object({ action: z.literal('config'), cycle_config: CycleConfig }),
]);
export type SoloAction = z.infer<typeof SoloAction>;

export const SoloRoutes = {
  start: '/users/@me/solo-sessions',
  current: '/users/@me/solo-sessions/current',
  byId: (id: string) => `/solo-sessions/${id}`,
} as const;
