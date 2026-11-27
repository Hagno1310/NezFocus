import type {
  CycleConfig,
  FocusPhase,
  FocusSessionEnd,
  FocusSessionState,
  RoomTimer,
} from '@nezfocus/shared';

// S-ROOM-02 as data: which chip, which button row and which lines; the screen turns them into words.
export type RoomViewInput = {
  session: FocusSessionState;
  timer: RoomTimer;
  meId: string;
  joined: boolean; // I sit in this room (else the `not-joined` preview)
  canManage: boolean; // MANAGE_STUDY_ROOMS (STUDY-11)
  others: number; // people in the room besides me ("8 người…" never counts me)
  syncing: boolean; // Gateway gone > 3 s (C-06 `syncing`)
  justJoined: boolean; // joined this session less than a minute ago, the Toast gone
  todayMinutes: number;
};

export type RoleChip =
  { kind: 'me' } | { kind: 'other'; userId: string } | { kind: 'none' };

export const roleChip = (v: RoomViewInput): RoleChip | null =>
  !v.joined
    ? null
    : v.session.host_id === null
      ? { kind: 'none' }
      : v.session.host_id === v.meId
        ? { kind: 'me' }
        : { kind: 'other', userId: v.session.host_id };

// S-ROOM-02 › Hàng nút: Host or MANAGE_STUDY_ROOMS; Participant; Participant who may only resume.
export type RoomControls = 'host' | 'participant' | 'resume';

export function roomControls(v: RoomViewInput): RoomControls {
  if (v.session.host_id === v.meId || v.canManage) return 'host';
  return v.session.host_id === null && v.session.status === 'paused'
    ? 'resume'
    : 'participant';
}

export type CycleLine =
  | { key: 'round'; round: number; next: FocusPhase; at: string }
  | { key: 'breakEnds'; at: string }
  | { key: 'pausedByMe' }
  | { key: 'pausedBy'; userId: string }
  | { key: 'pressResume' }
  | { key: 'syncing' }
  | { key: 'pending'; cycle: CycleConfig };

// C-06 › Trạng thái: the lines under the clock.
export function cycleLines(v: RoomViewInput): CycleLine[] {
  const { timer, session } = v;
  if (v.syncing) return [{ key: 'syncing' }];
  const by = session.last_action?.by ?? null;
  const first: CycleLine =
    timer.status === 'paused'
      ? session.host_id === null
        ? { key: 'pressResume' }
        : by === v.meId
          ? { key: 'pausedByMe' }
          : { key: 'pausedBy', userId: by ?? session.host_id }
      : timer.phase === 'focus'
        ? {
            key: 'round',
            round: timer.round,
            next: timer.next!.phase,
            at: timer.next!.at,
          }
        : { key: 'breakEnds', at: timer.next!.at };
  return timer.pending
    ? [first, { key: 'pending', cycle: timer.pending }]
    : [first];
}

export type CountLine =
  | { key: 'focusWith' | 'waitingWith' | 'focusing'; n: number }
  | { key: 'shortBreak' | 'longBreak' | 'alone' };

// Spec 03 › Đếm người: N never counts me.
export function countLine(v: RoomViewInput): CountLine {
  const { timer } = v;
  if (v.joined && v.others === 0) return { key: 'alone' };
  if (timer.status === 'paused')
    return { key: v.joined ? 'waitingWith' : 'focusing', n: v.others };
  if (timer.phase === 'short_break') return { key: 'shortBreak' };
  if (timer.phase === 'long_break') return { key: 'longBreak' };
  return { key: v.joined ? 'focusWith' : 'focusing', n: v.others };
}

export type SubLine =
  | { key: 'today'; minutes: number }
  | { key: 'startedAt' | 'joinedAt'; at: string }
  | { key: 'pausedNote' | 'noHost' }
  | { key: 'stretch'; minutes: number }
  | { key: 'roundDone'; round: number; at: string };

// The line under "Mời vào phòng".
export function subLine(v: RoomViewInput): SubLine | null {
  const { session, timer } = v;
  if (!v.joined) return { key: 'startedAt', at: session.started_at };
  if (v.others === 0) return null; // edge `alone` (chốt 27/11/2026)
  if (session.host_id === null) return { key: 'noHost' };
  if (timer.status === 'paused') return { key: 'pausedNote' };
  if (timer.phase === 'short_break')
    return { key: 'stretch', minutes: Math.floor(timer.remainingMs / 60_000) };
  if (timer.phase === 'long_break')
    return {
      key: 'roundDone',
      round: session.focus_phases_done,
      at: timer.next!.at,
    };
  if (v.justJoined && session.me?.counting_since)
    return { key: 'joinedAt', at: session.me.counting_since };
  return { key: 'today', minutes: v.todayMinutes };
}

// STUDY-11 (same rule as the backend's RoomSessionService.successor): the longest seat after mine
// whose holder may start, i.e. anyone, or MANAGE_STUDY_ROOMS when focus_control = managers.
export function successorOf(
  seats: readonly { user_id: string; joined_at: string }[],
  meId: string,
  focusControl: 'everyone' | 'managers' | 'off',
  canManage: (userId: string) => boolean,
): string | null {
  const next = [...seats]
    .filter((s) => s.user_id !== meId)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .find((s) => focusControl !== 'managers' || canManage(s.user_id));
  return next?.user_id ?? null;
}

export type RoomNotice =
  | { key: 'hostToMe' | 'hostLeftToMe'; from: string | null }
  | { key: 'hostToOther'; to: string }
  | { key: 'resumedBy'; by: string };

// The Toast an UPDATE brings (S-ROOM-02 `host-transferred`, `no-host-paused`; edge
// `host-left-paused`). A Start or my own press brings none.
export function roomNotice(
  prev: FocusSessionState,
  next: FocusSessionState,
  meId: string,
): RoomNotice | null {
  if (prev.id !== next.id) return null;
  if (prev.host_id !== next.host_id) {
    if (next.host_id === meId)
      return {
        key: next.status === 'paused' ? 'hostLeftToMe' : 'hostToMe',
        from: prev.host_id,
      };
    return next.host_id ? { key: 'hostToOther', to: next.host_id } : null;
  }
  const by = next.last_action?.by;
  if (
    prev.status === 'paused' &&
    next.status === 'running' &&
    next.host_id === null &&
    next.last_action?.action === 'resume' &&
    by &&
    by !== meId
  )
    return { key: 'resumedBy', by };
  return null;
}

export type SummaryReason =
  | { key: 'stoppedByMe' }
  | { key: 'stoppedBy' | 'focusOffBy'; by: string }
  | { key: 'empty' };

// S-ROOM-EDGE `host-stopped` and its kin: why it ended, and my whole minutes (null: under 1).
export function summaryOf(end: FocusSessionEnd, meId: string) {
  const by = end.ended_by;
  const reason: SummaryReason =
    end.end_reason === 'focus_disabled' && by
      ? { key: 'focusOffBy', by }
      : end.end_reason === 'stopped' && by
        ? by === meId
          ? { key: 'stoppedByMe' }
          : { key: 'stoppedBy', by }
        : { key: 'empty' };
  const seconds = end.focused_seconds ?? 0;
  return { reason, minutes: seconds < 60 ? null : Math.floor(seconds / 60) };
}

// S-ROOM-05 › Rời phòng: `seconds` = mine in the session, null if I never took part.
export const leftToast = (seconds: number | null) =>
  seconds === null
    ? ({ key: 'left' } as const)
    : seconds < 60
      ? ({ key: 'leftNone' } as const)
      : ({ key: 'leftMinutes', minutes: Math.floor(seconds / 60) } as const);
