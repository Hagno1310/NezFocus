import type { FocusSessionState } from '@nezfocus/shared';

// Spec 03 sample: Phòng học im lặng, started 21:11 (14:11Z), Vòng 2 ends 22:06 (15:06Z).
export const session = (
  extra: Partial<FocusSessionState> = {},
): FocusSessionState => ({
  id: '900',
  channel_id: '700',
  server_id: '10',
  status: 'running',
  phase: 'focus',
  cycle_config: { focus_min: 25, short_break_min: 5 },
  next_cycle_config: null,
  focus_phases_done: 1,
  phase_ends_at: '2026-10-18T15:06:00.000Z',
  paused_remaining_ms: null,
  host_id: '1',
  started_at: '2026-10-18T14:11:00.000Z',
  last_action: { by: '1', action: 'start' },
  me: { focused_seconds: 25 * 60, counting_since: '2026-10-18T14:41:00.000Z' },
  ...extra,
});
