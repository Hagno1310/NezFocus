import type { CycleConfig, FocusPhase } from './solo.contract.js';

export const phaseMinutes = (c: CycleConfig, phase: FocusPhase) =>
  phase === 'focus'
    ? c.focus_min
    : phase === 'long_break'
      ? c.long_break_min!
      : c.short_break_min;

// STUDY-11: the break after the `focusPhasesDone`-th focus is long every `long_break_every` focuses.
export const breakAfter = (c: CycleConfig, focusPhasesDone: number) =>
  c.long_break_every && focusPhasesDone % c.long_break_every === 0
    ? 'long_break'
    : 'short_break';
