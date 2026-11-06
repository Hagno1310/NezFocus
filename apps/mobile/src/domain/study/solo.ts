import {
  SOLO_WAIT_LIMIT_MS,
  toFocusedMinutes,
  type CurrentSoloSessionResponse,
  type CycleConfig,
  type FocusPhase,
  type SoloAction,
  type SoloSession,
  type SoloSessionResponse,
} from '@nezfocus/shared';

export interface SoloRepository {
  start(cycle: CycleConfig): Promise<SoloSessionResponse>;
  current(): Promise<CurrentSoloSessionResponse>;
  get(id: string): Promise<SoloSessionResponse>;
  act(id: string, action: SoloAction): Promise<SoloSessionResponse>;
}

// The last session id survives an app kill, so a session that ended meanwhile still shows its ending.
export interface SoloMemory {
  lastId(): Promise<string | null>;
  remember(id: string): Promise<void>;
  forget(): Promise<void>;
}

// stoppedHere tells our own "Dừng" from a stop on another device (S-STUDY-EDGE stopped-other-device).
export type SoloSnapshot = {
  session: SoloSession;
  offsetMs: number;
  stoppedHere: boolean;
};

// SRS 7.3.6 step 1: clock_offset = backend_time − local time when the answer arrived.
export const snapshotOf = (
  r: SoloSessionResponse,
  receivedAt: number,
  stoppedHere = false,
): SoloSnapshot => ({
  session: r.solo_session,
  offsetMs: Date.parse(r.backend_time) - receivedAt,
  stoppedHere,
});

export const backendNow = (s: SoloSnapshot, localNow: number) =>
  new Date(localNow + s.offsetMs);

export type BreakName = 'break' | 'short_break' | 'long_break';

export type SoloTimer = {
  status: 'running' | 'paused' | 'waiting';
  phase: FocusPhase;
  remainingMs: number;
  totalMs: number; // the whole phase, or the 10-minute wait
  round: number;
  // Focus: the break that follows ('break' when the cycle has no long break); a break: when it ends.
  next: { phase: BreakName | 'focus'; at: Date } | null;
  long: boolean; // C-06: a phase of 100+ minutes uses timer-long for the whole phase
  pending: CycleConfig | null;
  due: boolean; // ran out locally: the backend has moved on, ask it
};

const phaseMinutes = (c: CycleConfig, phase: FocusPhase) =>
  phase === 'focus'
    ? c.focus_min
    : phase === 'long_break'
      ? (c.long_break_min ?? c.short_break_min)
      : c.short_break_min;

function nextBreak(s: SoloSession): BreakName {
  // Same rule as the backend machine: the pending config decides the next break.
  const every = (s.next_cycle_config ?? s.cycle_config).long_break_every;
  if (!every) return 'break';
  return (s.focus_phases_done + 1) % every === 0 ? 'long_break' : 'short_break';
}

// `localNow`: the phone clock; the offset turns it into backend time.
export function timerOf(snap: SoloSnapshot, localNow: Date): SoloTimer | null {
  const s = snap.session;
  const now = backendNow(snap, localNow.getTime());
  if (s.status === 'ended') return null;
  const deadline =
    s.status === 'running'
      ? Date.parse(s.phase_ends_at!)
      : s.status === 'waiting'
        ? Date.parse(s.waiting_since!) + SOLO_WAIT_LIMIT_MS
        : null;
  const left =
    deadline === null ? s.paused_remaining_ms! : deadline - now.getTime();
  const end = s.status === 'running' ? new Date(deadline!) : null;
  const totalMs =
    s.status === 'waiting'
      ? SOLO_WAIT_LIMIT_MS
      : phaseMinutes(s.cycle_config, s.phase) * 60_000;
  return {
    status: s.status,
    phase: s.phase,
    // The offset carries the network delay of its response, so cap at the phase length (no 25:01).
    remainingMs: Math.min(totalMs, Math.max(0, left)),
    totalMs,
    round: s.focus_phases_done + (s.phase === 'focus' ? 1 : 0),
    next:
      end &&
      (s.phase === 'focus'
        ? { phase: nextBreak(s), at: end }
        : {
            phase: 'focus',
            at: end,
          }),
    long: phaseMinutes(s.cycle_config, s.phase) >= 100,
    pending: s.next_cycle_config,
    due: deadline !== null && left <= 0,
  };
}

export type SoloEnding = {
  kind: 'summary' | 'too-short' | 'expired' | 'stopped-other-device';
  minutes: number;
  endedAt: Date;
  days: { yesterday: number; today: number } | null; // S-STUDY-EDGE midnight
  hitCap: boolean; // S-STUDY-EDGE long-session
};

export function endingOf(snap: SoloSnapshot): SoloEnding | null {
  const s = snap.session;
  if (s.status !== 'ended') return null;
  const minutes = toFocusedMinutes(s.focused_seconds);
  const kind =
    s.end_reason === 'wait_timeout'
      ? 'expired'
      : minutes < 1
        ? 'too-short'
        : s.end_reason === 'stopped' && !snap.stoppedHere
          ? 'stopped-other-device'
          : 'summary';
  const [yesterday, today] = s.days.slice(-2);
  return {
    kind,
    minutes,
    endedAt: new Date(s.ended_at!),
    days:
      s.days.length >= 2
        ? {
            yesterday: toFocusedMinutes(yesterday!.focused_seconds),
            today: toFocusedMinutes(today!.focused_seconds),
          }
        : null,
    hitCap: s.hit_daily_cap,
  };
}

// Offline: pause / resume / stop show at once; the backend's answer replaces this when it arrives.
export function applyLocally(
  s: SoloSession,
  action: SoloAction,
  now: Date,
): SoloSession | null {
  const at = now.getTime();
  switch (action.action) {
    case 'pause':
      if (s.status !== 'running') return null;
      return {
        ...s,
        status: 'paused',
        paused_remaining_ms: Math.max(0, Date.parse(s.phase_ends_at!) - at),
        phase_ends_at: null,
      };
    case 'resume':
      if (s.status !== 'paused') return null;
      return {
        ...s,
        status: 'running',
        phase_ends_at: new Date(at + s.paused_remaining_ms!).toISOString(),
        paused_remaining_ms: null,
      };
    case 'stop':
      if (s.status === 'ended') return null;
      return {
        ...s,
        status: 'ended',
        phase_ends_at: null,
        paused_remaining_ms: null,
        ended_at: now.toISOString(),
        end_reason: 'stopped',
      };
    default:
      return null;
  }
}

// STUDY-10 AC3: what to show when the app opens or refetches.
export async function restoreSolo(
  repo: SoloRepository,
  memory: SoloMemory,
  shown: SoloSnapshot | null,
  localNow: () => number,
): Promise<SoloSnapshot | null> {
  // An ending is final; it stays until "Xong" even if the app refetches meanwhile.
  if (shown?.session.status === 'ended') return shown;
  const current = await repo.current();
  if (current.solo_session) {
    await memory.remember(current.solo_session.id);
    return snapshotOf(current as SoloSessionResponse, localNow());
  }
  const id = await memory.lastId();
  if (!id) return null;
  try {
    return snapshotOf(await repo.get(id), localNow());
  } catch {
    await memory.forget();
    return null;
  }
}

export function receiveSoloEvent(
  shown: SoloSnapshot | null,
  r: SoloSessionResponse,
  receivedAt: number,
): SoloSnapshot | null {
  const same = shown?.session.id === r.solo_session.id;
  if (r.solo_session.status === 'ended' && !same) return shown;
  return snapshotOf(r, receivedAt, same && shown.stoppedHere);
}
