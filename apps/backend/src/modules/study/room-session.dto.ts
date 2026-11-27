import type {
  FocusSessionEnd,
  FocusSessionMe,
  FocusSessionResponse,
  FocusSessionState,
} from '@nezfocus/shared';
import type { Participation, RoomRecord } from './room-session.repository.js';

const iso = (d: Date | null) => d?.toISOString() ?? null;
const later = (a: Date, b: Date) => (a > b ? a : b);

// CR-28 #38: one person's Participations in the session; null if they never took part.
export function meOf(
  record: RoomRecord,
  mine: Participation[],
): FocusSessionMe | null {
  if (!mine.length) return null;
  const open = mine.find((p) => p.leftAt === null);
  const s = record.state;
  const counting =
    open && s.status === 'running' && s.phase === 'focus'
      ? later(s.phaseStartedAt, open.joinedAt)
      : null;
  return {
    focused_seconds: mine.reduce((n, p) => n + p.focusedSeconds, 0),
    counting_since: iso(counting),
  };
}

export const toFocusSessionJson = (
  r: RoomRecord,
  me: FocusSessionMe | null,
): FocusSessionState => ({
  id: r.id.toString(),
  channel_id: r.channelId.toString(),
  server_id: r.serverId.toString(),
  status: r.state.status === 'paused' ? 'paused' : 'running',
  phase: r.state.phase,
  cycle_config: r.state.config,
  next_cycle_config: r.state.nextConfig,
  focus_phases_done: r.state.focusPhasesDone,
  phase_ends_at: iso(r.state.phaseEndsAt),
  paused_remaining_ms: r.state.pausedRemainingMs,
  host_id: r.hostId?.toString() ?? null,
  started_at: r.startedAt.toISOString(),
  last_action: r.state.lastAction,
  me,
});

export const toFocusSessionResponse = (
  r: RoomRecord,
  me: FocusSessionMe | null,
  now: Date,
): FocusSessionResponse => ({
  focus_session: toFocusSessionJson(r, me),
  backend_time: now.toISOString(),
});

export const toFocusSessionEnd = (
  r: RoomRecord,
  focusedSeconds: number | null,
): FocusSessionEnd => ({
  id: r.id.toString(),
  channel_id: r.channelId.toString(),
  server_id: r.serverId.toString(),
  ended_at: r.state.endedAt!.toISOString(),
  end_reason: r.state.endReason!,
  ended_by: r.state.endedBy?.toString() ?? null,
  focused_seconds: focusedSeconds,
});
