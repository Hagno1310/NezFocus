import {
  breakAfter,
  phaseMinutes,
  type CycleConfig,
  type FocusPhase,
  type FocusSessionAction,
  type FocusSessionEndReason,
} from '@nezfocus/shared';
import type { LastAction } from './focus.schema.js';
import type { FocusInterval } from './focused-time.js';

// SRS 8.4.3 for a Room Session, as plain data so every rule is tested on a fake clock.
export type RoomState = {
  config: CycleConfig;
  nextConfig: CycleConfig | null;
  status: 'running' | 'paused' | 'ended';
  phase: FocusPhase;
  focusPhasesDone: number;
  // Start of the running stretch not yet credited: phase start, or the last resume.
  phaseStartedAt: Date;
  phaseEndsAt: Date | null;
  pausedRemainingMs: number | null;
  lastAction: LastAction | null;
  endedAt: Date | null;
  endReason: FocusSessionEndReason | null;
  endedBy: bigint | null;
};

// `focus`: stretches of the session's focus clock, to credit to whoever was in the room.
export type RoomStep = { state: RoomState; focus: FocusInterval[] };

const MINUTE = 60_000;
const after = (t: Date, ms: number) => new Date(t.getTime() + ms);

function enter(s: RoomState, phase: FocusPhase, at: Date): RoomState {
  // STUDY-11 AC6: a pending config takes over at the next phase.
  const config = s.nextConfig ?? s.config;
  return {
    ...s,
    config,
    nextConfig: null,
    status: 'running',
    phase,
    phaseStartedAt: at,
    phaseEndsAt: after(at, phaseMinutes(config, phase) * MINUTE),
    pausedRemainingMs: null,
  };
}

function enterBreak(s: RoomState, at: Date) {
  const done = s.focusPhasesDone + 1;
  return enter(
    { ...s, focusPhasesDone: done },
    breakAfter(s.nextConfig ?? s.config, done),
    at,
  );
}

const focusSoFar = (s: RoomState, now: Date): FocusInterval[] =>
  s.status === 'running' && s.phase === 'focus'
    ? [{ start: s.phaseStartedAt, end: now, phaseEndsAt: s.phaseEndsAt }]
    : [];

export const startRoom = (
  config: CycleConfig,
  by: string,
  now: Date,
): RoomState =>
  enter(
    {
      config,
      nextConfig: null,
      status: 'running',
      phase: 'focus',
      focusPhasesDone: 0,
      phaseStartedAt: now,
      phaseEndsAt: null,
      pausedRemainingMs: null,
      lastAction: { by, action: 'start' },
      endedAt: null,
      endReason: null,
      endedBy: null,
    },
    'focus',
    now,
  );

// What the clock alone does (the BullMQ job): 4.9.1, a break ends into focus, the room never waits.
export function advanceRoom(s: RoomState, now: Date): RoomStep {
  const focus: FocusInterval[] = [];
  while (s.status === 'running' && s.phaseEndsAt! <= now) {
    const end = s.phaseEndsAt!;
    if (s.phase === 'focus') {
      focus.push(...focusSoFar(s, end));
      s = enterBreak(s, end);
    } else s = enter(s, 'focus', end);
    s = { ...s, lastAction: null };
  }
  return { state: s, focus };
}

// Stop is endRoom: it ends the session rather than changing it.
export type RoomControl =
  | { action: 'pause' | 'resume' | 'skip' }
  | Extract<FocusSessionAction, { action: 'config' }>;

// A control at `now` by `by`. Repeating one that already took effect is a no-op (STUDY-11 AC11).
export function applyRoomAction(
  current: RoomState,
  action: RoomControl,
  by: string,
  now: Date,
): RoomStep {
  const { state: s, focus } = advanceRoom(current, now);
  const done = (state: RoomState, more: FocusInterval[] = []) => ({
    state: { ...state, lastAction: { by, action: action.action } },
    focus: [...focus, ...more],
  });
  if (s.status === 'ended') return { state: s, focus };

  switch (action.action) {
    case 'pause':
      if (s.status === 'paused') return { state: s, focus };
      return done(
        {
          ...s,
          status: 'paused',
          pausedRemainingMs: s.phaseEndsAt!.getTime() - now.getTime(),
          phaseEndsAt: null,
        },
        focusSoFar(s, now),
      );
    case 'resume':
      if (s.status === 'running') return { state: s, focus };
      return done({
        ...s,
        status: 'running',
        phaseStartedAt: now,
        phaseEndsAt: after(now, s.pausedRemainingMs!),
        pausedRemainingMs: null,
      });
    case 'skip':
      // 4.9.1: skipped focus still counts.
      return s.phase === 'focus'
        ? done(enterBreak(s, now), focusSoFar(s, now))
        : done(enter(s, 'focus', now));
    case 'config':
      return done({ ...s, nextConfig: action.cycle_config });
  }
}

// Stop, Phòng học off, channel deleted, empty room. Ending an ended session does nothing.
export function endRoom(
  current: RoomState,
  reason: FocusSessionEndReason,
  by: bigint | null,
  now: Date,
): RoomStep {
  if (current.status === 'ended') return { state: current, focus: [] };
  const { state: s, focus } = advanceRoom(current, now);
  return {
    state: {
      ...s,
      status: 'ended',
      phaseEndsAt: null,
      pausedRemainingMs: null,
      endedAt: now,
      endReason: reason,
      endedBy: by,
    },
    focus: [...focus, ...focusSoFar(s, now)],
  };
}
