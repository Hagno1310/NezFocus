import { describe, expect, it } from 'vitest';
import {
  advanceRoom,
  applyRoomAction,
  endRoom,
  startRoom,
  type RoomState,
} from './room-machine.js';

const MIN = 60_000;
const T0 = new Date('2026-10-18T13:00:00Z'); // 20:00 in Hà Nội
const at = (m: number) => new Date(T0.getTime() + m * MIN);
const by = '7';
const c25 = { focus_min: 25, short_break_min: 5 };

const run = (
  s: RoomState,
  ...steps: [number, Parameters<typeof applyRoomAction>[1]][]
) => {
  const focus = [];
  for (const [m, action] of steps) {
    const r = applyRoomAction(s, action, by, at(m));
    s = r.state;
    focus.push(...r.focus);
  }
  return { state: s, focus };
};

describe('Room Session machine (REQ-STUDY-01, STUDY-11, SRS 8.4.3)', () => {
  it('starts in focus, the starter as last action', () => {
    const s = startRoom(c25, by, T0);
    expect(s).toMatchObject({
      status: 'running',
      phase: 'focus',
      phaseEndsAt: at(25),
      lastAction: { by, action: 'start' },
    });
  });

  it('a focus ends into a break and a break into focus, by itself (4.9.1); focus is credited', () => {
    const { state, focus } = advanceRoom(startRoom(c25, by, T0), at(32));
    expect(state).toMatchObject({
      phase: 'focus',
      focusPhasesDone: 1,
      phaseStartedAt: at(30),
      phaseEndsAt: at(55),
      lastAction: null, // the clock moved on
    });
    expect(focus).toEqual([{ start: T0, end: at(25), phaseEndsAt: at(25) }]);
  });

  it('a long break replaces the short one after every N focus phases', () => {
    const s = startRoom(
      { ...c25, long_break_min: 15, long_break_every: 2 },
      by,
      T0,
    );
    const { state } = advanceRoom(s, at(56));
    expect(state).toMatchObject({
      phase: 'long_break',
      focusPhasesDone: 2,
      phaseEndsAt: at(70),
    });
  });

  it('STUDY-01 AC5: pause with 10:00 left, resume 3 minutes later → 10:00 left', () => {
    const { state, focus } = run(
      startRoom(c25, by, T0),
      [15, { action: 'pause' }],
      [18, { action: 'resume' }],
    );
    expect(state).toMatchObject({
      status: 'running',
      phaseStartedAt: at(18),
      phaseEndsAt: at(28),
      pausedRemainingMs: null,
      lastAction: { by, action: 'resume' },
    });
    // the 15 minutes before the pause are credited at the pause; the 3 paused are not
    expect(focus).toEqual([{ start: T0, end: at(15), phaseEndsAt: at(25) }]);
  });

  it('a pause stays paused past the old phase end; the clock does not move it', () => {
    const { state } = run(startRoom(c25, by, T0), [15, { action: 'pause' }]);
    const later = advanceRoom(state, at(60));
    expect(later.state).toMatchObject({
      status: 'paused',
      pausedRemainingMs: 10 * MIN,
      lastAction: { by, action: 'pause' },
    });
    expect(later.focus).toEqual([]);
  });

  it('STUDY-11 AC11: a second resume does nothing', () => {
    const { state } = run(
      startRoom(c25, by, T0),
      [15, { action: 'pause' }],
      [18, { action: 'resume' }],
    );
    const again = applyRoomAction(state, { action: 'resume' }, '8', at(18));
    expect(again.state).toBe(state);
  });

  it('STUDY-11 AC6: 25/5 → 50/10 at minute 20 keeps 5:00, then 50/10', () => {
    const { state } = run(startRoom(c25, by, T0), [
      20,
      {
        action: 'config',
        cycle_config: { focus_min: 50, short_break_min: 10 },
      },
    ]);
    expect(state.phaseEndsAt).toEqual(at(25));
    const brk = advanceRoom(state, at(26)).state;
    expect(brk).toMatchObject({
      phase: 'short_break',
      phaseEndsAt: at(35),
      nextConfig: null,
      config: { focus_min: 50, short_break_min: 10 },
    });
    expect(advanceRoom(brk, at(36)).state.phaseEndsAt).toEqual(at(85));
  });

  it('a config change while paused waits for the next phase too', () => {
    const { state } = run(
      startRoom(c25, by, T0),
      [15, { action: 'pause' }],
      [
        16,
        {
          action: 'config',
          cycle_config: { focus_min: 50, short_break_min: 10 },
        },
      ],
    );
    expect(state).toMatchObject({
      status: 'paused',
      pausedRemainingMs: 10 * MIN,
      nextConfig: { focus_min: 50 },
    });
  });

  it('skip in focus credits the part done and starts the break; skip in a break starts focus', () => {
    const r = run(startRoom(c25, by, T0), [12, { action: 'skip' }]);
    expect(r.focus).toEqual([{ start: T0, end: at(12), phaseEndsAt: at(25) }]);
    expect(r.state).toMatchObject({
      phase: 'short_break',
      phaseEndsAt: at(17),
    });
    const f = applyRoomAction(r.state, { action: 'skip' }, by, at(13)).state;
    expect(f).toMatchObject({ phase: 'focus', phaseEndsAt: at(38) });
  });

  it('ending credits the running focus once; ending again does nothing', () => {
    const first = endRoom(startRoom(c25, by, T0), 'stopped', 7n, at(31));
    expect(first.state).toMatchObject({
      status: 'ended',
      endedAt: at(31),
      endReason: 'stopped',
      endedBy: 7n,
      phaseEndsAt: null,
    });
    // 25 of round 1 at its end, then 1 minute of round 2
    expect(first.focus).toEqual([
      { start: T0, end: at(25), phaseEndsAt: at(25) },
      { start: at(30), end: at(31), phaseEndsAt: at(55) },
    ]);
    const again = endRoom(first.state, 'focus_disabled', 8n, at(32));
    expect(again).toEqual({ state: first.state, focus: [] });
  });
});
