import type { FocusSessionState } from './room-session.contract.js';
import type { CycleConfig, FocusPhase } from './solo.contract.js';
import { breakAfter, phaseMinutes } from './solo-rules.js';

const MIN = 60_000;

// The part of a Room Session that moves with the clock.
export type RoomClock = Pick<
  FocusSessionState,
  | 'status'
  | 'phase'
  | 'cycle_config'
  | 'next_cycle_config'
  | 'focus_phases_done'
  | 'phase_ends_at'
  | 'paused_remaining_ms'
>;

export type ClockTiming = { received: number; sent?: number };

// SRS 7.3.6 step 1: clock_offset = backend_time − the local time it stands for (mid round trip).
export function clockOffsetMs(backendTime: string, timing: ClockTiming) {
  const local =
    timing.sent === undefined
      ? timing.received
      : (timing.sent + timing.received) / 2;
  return Date.parse(backendTime) - local;
}

// 4.9.1: focus → break → focus … by itself; a pending config takes over at the next phase (STUDY-11 AC6).
function nextPhase(c: RoomClock): RoomClock {
  const start = Date.parse(c.phase_ends_at!);
  const config: CycleConfig = c.next_cycle_config ?? c.cycle_config;
  const done = c.focus_phases_done + (c.phase === 'focus' ? 1 : 0);
  const phase: FocusPhase =
    c.phase === 'focus' ? breakAfter(config, done) : 'focus';
  return {
    ...c,
    phase,
    cycle_config: config,
    next_cycle_config: null,
    focus_phases_done: done,
    phase_ends_at: new Date(
      start + phaseMinutes(config, phase) * MIN,
    ).toISOString(),
  };
}

// 7.3.6 step 4: the phase at `backendNow`, skipping every phase that ended meanwhile.
export function roomClockAt(clock: RoomClock, backendNow: number): RoomClock {
  let at = clock;
  while (at.status === 'running' && Date.parse(at.phase_ends_at!) <= backendNow)
    at = nextPhase(at);
  return at;
}

export type RoomTimer = {
  status: FocusSessionState['status'];
  phase: FocusPhase;
  remainingMs: number;
  totalMs: number;
  round: number;
  next: { phase: FocusPhase; at: string } | null; // running only
  long: boolean; // C-06: a phase of 100+ minutes uses timer-long for the whole phase
  pending: CycleConfig | null;
};

// `localNow`: the phone clock; `offsetMs` from clockOffsetMs turns it into backend time.
export function roomTimer(
  session: RoomClock,
  offsetMs: number,
  localNow: number,
): RoomTimer {
  const now = localNow + offsetMs;
  const c = roomClockAt(session, now);
  const minutes = phaseMinutes(c.cycle_config, c.phase);
  const totalMs = minutes * MIN;
  const left =
    c.status === 'running'
      ? Date.parse(c.phase_ends_at!) - now
      : c.paused_remaining_ms!;
  const following = c.status === 'running' ? nextPhase(c) : null;
  return {
    status: c.status,
    phase: c.phase,
    // The offset carries the network delay of its answer, so cap at the phase length (no 25:01).
    remainingMs: Math.min(totalMs, Math.max(0, left)),
    totalMs,
    round: c.focus_phases_done + (c.phase === 'focus' ? 1 : 0),
    next: following && { phase: following.phase, at: c.phase_ends_at! },
    long: minutes >= 100,
    pending: c.next_cycle_config,
  };
}

// My seconds in the session right now: what the backend credited plus the stretch still counting,
// which stops at the end of its focus phase (the backend credits it there, then sends `me` again).
export function myFocusedSeconds(
  session: Pick<FocusSessionState, 'me' | 'phase_ends_at'>,
  offsetMs: number,
  localNow: number,
): number | null {
  const me = session.me;
  if (!me) return null;
  if (!me.counting_since || !session.phase_ends_at) return me.focused_seconds;
  const until = Math.min(
    localNow + offsetMs,
    Date.parse(session.phase_ends_at),
  );
  const running = until - Date.parse(me.counting_since);
  return me.focused_seconds + Math.max(0, Math.floor(running / 1000));
}
