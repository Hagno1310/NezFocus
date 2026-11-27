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
export function roomClockAt<C extends RoomClock>(c: C, backendNow: number): C {
  let s: RoomClock = c;
  while (s.status === 'running' && Date.parse(s.phase_ends_at!) <= backendNow)
    s = nextPhase(s);
  return { ...c, ...s };
}

export type RoomTimer = {
  status: FocusSessionState['status'];
  phase: FocusPhase;
  remainingMs: number;
  totalMs: number;
  round: number;
  phaseEndsAt: string | null;
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
    phaseEndsAt: c.phase_ends_at,
    next: following && { phase: following.phase, at: c.phase_ends_at! },
    long: minutes >= 100,
    pending: c.next_cycle_config,
  };
}
