import {
  breakAfter,
  ErrorCode,
  phaseMinutes,
  SOLO_WAIT_LIMIT_MS,
  type CycleConfig,
  type FocusPhase,
  type SoloAction,
  type SoloEndReason,
  type SoloStatus,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import type { FocusInterval } from './focused-time.js';

// SRS 8.4.3 for a Solo Session, as plain data so every rule is tested on a fake clock.
export type SoloState = {
  config: CycleConfig;
  nextConfig: CycleConfig | null;
  status: SoloStatus;
  phase: FocusPhase;
  focusPhasesDone: number;
  // Start of the running stretch not yet credited: phase start, or the last resume.
  phaseStartedAt: Date;
  phaseEndsAt: Date | null;
  pausedRemainingMs: number | null;
  waitingSince: Date | null;
  endedAt: Date | null;
  endReason: SoloEndReason | null;
};

export type SoloStep = { state: SoloState; focus: FocusInterval[] };

const MINUTE = 60_000;
const after = (t: Date, ms: number) => new Date(t.getTime() + ms);

function enter(s: SoloState, phase: FocusPhase, at: Date): SoloState {
  // STUDY-11 AC6: a pending config takes over at the next phase.
  const config = s.nextConfig ?? s.config;
  const minutes = phaseMinutes(config, phase);
  return {
    ...s,
    config,
    nextConfig: null,
    status: 'running',
    phase,
    phaseStartedAt: at,
    phaseEndsAt: after(at, minutes * MINUTE),
    pausedRemainingMs: null,
    waitingSince: null,
  };
}

function enterBreak(s: SoloState, at: Date) {
  const done = s.focusPhasesDone + 1;
  const phase = breakAfter(s.nextConfig ?? s.config, done);
  return enter({ ...s, focusPhasesDone: done }, phase, at);
}

const focusSoFar = (s: SoloState, now: Date): FocusInterval[] =>
  s.status === 'running' && s.phase === 'focus'
    ? [{ start: s.phaseStartedAt, end: now, phaseEndsAt: s.phaseEndsAt }]
    : [];

export const startSolo = (config: CycleConfig, now: Date): SoloState =>
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
      waitingSince: null,
      endedAt: null,
      endReason: null,
    },
    'focus',
    now,
  );

// What the clock alone does: phase ends (the BullMQ job) and the 10-minute wait running out.
export function advance(s: SoloState, now: Date): SoloStep {
  const focus: FocusInterval[] = [];
  for (;;) {
    if (s.status === 'running' && s.phaseEndsAt! <= now) {
      const end = s.phaseEndsAt!;
      if (s.phase === 'focus') {
        focus.push(...focusSoFar(s, end));
        s = enterBreak(s, end);
      } else {
        // DEC-23: Solo does not start the next focus by itself.
        s = { ...s, status: 'waiting', waitingSince: end, phaseEndsAt: null };
      }
    } else if (
      s.status === 'waiting' &&
      s.waitingSince!.getTime() + SOLO_WAIT_LIMIT_MS <= now.getTime()
    ) {
      // REQ-STUDY-10 AC5: the session ends at the end of the break, not when we noticed.
      s = {
        ...s,
        status: 'ended',
        endedAt: s.waitingSince,
        endReason: 'wait_timeout',
      };
    } else {
      return { state: s, focus };
    }
  }
}

const conflict = (s: SoloState, action: string) =>
  new AppError(
    ErrorCode.Conflict,
    `cannot ${action} a ${s.status} Solo Session`,
  );

// A user action at `now`. Repeating an action that already took effect is a no-op, so a resend after going offline is safe.
export function applyAction(
  current: SoloState,
  action: SoloAction,
  now: Date,
): SoloStep {
  const { state: s, focus } = advance(current, now);
  const done = (state: SoloState, more: FocusInterval[] = []) => ({
    state,
    focus: [...focus, ...more],
  });

  switch (action.action) {
    case 'stop':
      if (s.status === 'ended') return done(s);
      return done(
        {
          ...s,
          status: 'ended',
          phaseEndsAt: null,
          pausedRemainingMs: null,
          endedAt: now,
          endReason: 'stopped',
        },
        focusSoFar(s, now),
      );
    case 'pause':
      if (s.status === 'paused') return done(s);
      if (s.status !== 'running') throw conflict(s, 'pause');
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
      if (s.status === 'running') return done(s);
      if (s.status !== 'paused') throw conflict(s, 'resume');
      return done({
        ...s,
        status: 'running',
        phaseStartedAt: now,
        phaseEndsAt: after(now, s.pausedRemainingMs!),
        pausedRemainingMs: null,
      });
    case 'skip':
      if (s.status !== 'running' && s.status !== 'paused')
        throw conflict(s, 'skip');
      // 4.9.1: skipped focus still counts; spec 04: skipping a break goes straight to focus.
      return s.phase === 'focus'
        ? done(enterBreak(s, now), focusSoFar(s, now))
        : done(enter(s, 'focus', now));
    case 'continue':
      if (s.status === 'running' && s.phase === 'focus') return done(s);
      if (s.status !== 'waiting') throw conflict(s, 'continue');
      return done(enter(s, 'focus', now));
    case 'config':
      if (s.status === 'ended') throw conflict(s, 'reconfigure');
      return done({ ...s, nextConfig: action.cycle_config });
  }
}
