import type { SoloSession } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { SoloSnapshot } from './solo';
import { phaseRanOut, soloAlerts } from './soloAlerts';

const at = (h: number, m: number) => new Date(2026, 9, 18, h, m);
const iso = (d: Date) => d.toISOString();

const snap = (over: Partial<SoloSession> = {}, offsetMs = 0): SoloSnapshot => ({
  offsetMs,
  stoppedHere: false,
  session: {
    id: '42',
    status: 'running',
    phase: 'focus',
    cycle_config: { focus_min: 25, short_break_min: 5 },
    next_cycle_config: null,
    focus_phases_done: 0,
    phase_ends_at: iso(at(21, 36)),
    paused_remaining_ms: null,
    waiting_since: null,
    started_at: iso(at(21, 11)),
    ended_at: null,
    end_reason: null,
    focused_seconds: 0,
    days: [],
    hit_daily_cap: false,
    ...over,
  },
});

describe('soloAlerts (SRS 7.3.6: Solo schedules up to the end of the current break)', () => {
  it('STUDY-10 AC1: focus → "to-break" at its end, then "solo-waiting" when that break ends', () => {
    expect(soloAlerts(snap(), at(21, 20))).toEqual([
      { at: at(21, 36), kind: 'to-break', minutes: 5 },
      { at: at(21, 41), kind: 'solo-waiting' },
    ]);
  });

  it('the long break is named and timed when this round earns it', () => {
    const cfg = {
      focus_min: 25,
      short_break_min: 5,
      long_break_min: 15,
      long_break_every: 2,
    };
    expect(
      soloAlerts(snap({ cycle_config: cfg, focus_phases_done: 1 }), at(21, 20)),
    ).toEqual([
      { at: at(21, 36), kind: 'to-long-break', minutes: 15 },
      { at: at(21, 51), kind: 'solo-waiting' },
    ]);
  });

  it('a pending config sets the coming break (STUDY-11 AC6)', () => {
    const next = { focus_min: 50, short_break_min: 10 };
    expect(
      soloAlerts(snap({ next_cycle_config: next }), at(21, 20))[1],
    ).toEqual({ at: at(21, 46), kind: 'solo-waiting' });
  });

  it('in a break, only "solo-waiting"; Solo never schedules the next focus (it waits for "Học tiếp")', () => {
    expect(
      soloAlerts(
        snap({ phase: 'short_break', phase_ends_at: iso(at(21, 41)) }),
        at(21, 38),
      ),
    ).toEqual([{ at: at(21, 41), kind: 'solo-waiting' }]);
  });

  it('paused, waiting and ended schedule nothing (stop leaves no notification behind)', () => {
    for (const status of ['paused', 'waiting', 'ended'] as const)
      expect(
        soloAlerts(snap({ status, phase_ends_at: null }), at(21, 20)),
      ).toEqual([]);
  });

  it('times already past are dropped', () => {
    expect(soloAlerts(snap(), at(21, 38))).toEqual([
      { at: at(21, 41), kind: 'solo-waiting' },
    ]);
  });

  it('backend times become phone times through the clock offset', () => {
    const fast = snap({}, -2 * 60_000); // phone 2 minutes ahead of the backend
    expect(soloAlerts(fast, at(21, 20))[0]?.at).toEqual(at(21, 38));
  });
});

describe('phaseRanOut (SRS 3.3: the foreground phase-change sound)', () => {
  const end = Date.parse(iso(at(21, 36)));
  const s = (over: Partial<SoloSession> = {}) => snap(over).session;

  it('focus ran out into the break → sound', () => {
    expect(phaseRanOut(s(), s({ phase: 'short_break' }), end)).toBe(true);
  });

  it('the break ran out into waiting for "Học tiếp" → sound', () => {
    const brk = s({ phase: 'short_break' });
    expect(
      phaseRanOut(brk, s({ phase: 'short_break', status: 'waiting' }), end),
    ).toBe(true);
  });

  it('"Bỏ qua pha" before the end → no sound (the user did it)', () => {
    expect(
      phaseRanOut(s(), s({ phase: 'short_break' }), end - 5 * 60_000),
    ).toBe(false);
  });

  it('back in the app minutes after the end → no late sound (the notification told)', () => {
    expect(
      phaseRanOut(s(), s({ phase: 'short_break' }), end + 3 * 60_000),
    ).toBe(false);
  });

  it('paused, stopped, or nothing moved → no sound', () => {
    expect(phaseRanOut(s(), s({ status: 'paused' }), end)).toBe(false);
    expect(phaseRanOut(s(), s({ status: 'ended' }), end)).toBe(false);
    expect(phaseRanOut(s(), s(), end)).toBe(false);
  });
});
