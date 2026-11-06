import { ErrorCode, type CycleConfig } from '@nezfocus/shared';
import {
  advance,
  applyAction,
  startSolo,
  type SoloState,
} from './solo-machine.js';

const P25 = { focus_min: 25, short_break_min: 5 } satisfies CycleConfig;
const at = (hhmm: string) => new Date(`2026-11-06T${hhmm}:00Z`);
const minutes = (i: { start: Date; end: Date }) =>
  (i.end.getTime() - i.start.getTime()) / 60_000;

// Drives a session through actions at given times, collecting every focus interval credited.
const run = (
  state: SoloState,
  steps: [string, Parameters<typeof applyAction>[1] | 'tick'][],
) => {
  const credited: { start: Date; end: Date }[] = [];
  for (const [time, action] of steps) {
    const step =
      action === 'tick'
        ? advance(state, at(time))
        : applyAction(state, action, at(time));
    credited.push(...step.focus);
    state = step.state;
  }
  return {
    state,
    credited,
    total: credited.reduce((m, i) => m + minutes(i), 0),
  };
};

describe('solo machine', () => {
  it('starts in a running focus phase ending after focus_min', () => {
    expect(startSolo(P25, at('20:00'))).toMatchObject({
      status: 'running',
      phase: 'focus',
      phaseEndsAt: at('20:25'),
    });
  });

  it('AC1: the job at the end of focus moves to the break and credits 25 minutes', () => {
    const { state, credited } = run(startSolo(P25, at('20:00')), [
      ['20:25', 'tick'],
    ]);
    expect(state).toMatchObject({
      status: 'running',
      phase: 'short_break',
      phaseEndsAt: at('20:30'),
      focusPhasesDone: 1,
    });
    expect(credited).toEqual([
      { start: at('20:00'), end: at('20:25'), phaseEndsAt: at('20:25') },
    ]);
  });

  it('DEC-23: the end of a break waits for "Học tiếp" instead of starting focus', () => {
    const { state } = run(startSolo(P25, at('20:00')), [['20:31', 'tick']]);
    expect(state).toMatchObject({
      status: 'waiting',
      waitingSince: at('20:30'),
      phaseEndsAt: null,
    });
  });

  it('AC4: "Học tiếp" at 22:04 after a break ending 22:00 starts focus at 22:04, the wait counts nowhere', () => {
    const { state, total } = run(startSolo(P25, at('21:30')), [
      ['22:02', 'tick'],
      ['22:04', { action: 'continue' }],
      ['22:29', 'tick'],
    ]);
    expect(total).toBe(50);
    expect(state).toMatchObject({
      phase: 'short_break',
      phaseEndsAt: at('22:34'),
      focusPhasesDone: 2,
    });
  });

  it('AC5: no "Học tiếp" by 22:10 ends the session at 22:00', () => {
    const { state } = run(startSolo(P25, at('21:30')), [['22:10', 'tick']]);
    expect(state).toMatchObject({
      status: 'ended',
      endedAt: at('22:00'),
      endReason: 'wait_timeout',
    });
  });

  it('AC5: one minute short of the limit is still waiting', () => {
    const { state } = run(startSolo(P25, at('21:30')), [['22:09', 'tick']]);
    expect(state.status).toBe('waiting');
  });

  it('AC6: stop at minute 12 of focus credits 12 minutes, no confirmation step', () => {
    const { state, total } = run(startSolo(P25, at('20:00')), [
      ['20:12', { action: 'stop' }],
    ]);
    expect(total).toBe(12);
    expect(state).toMatchObject({
      status: 'ended',
      endedAt: at('20:12'),
      endReason: 'stopped',
    });
  });

  it('STUDY-15 AC3: a stop arriving an hour late credits the 25 scheduled minutes only', () => {
    const { state, total } = run(startSolo(P25, at('20:00')), [
      ['21:25', { action: 'stop' }],
    ]);
    expect(total).toBe(25);
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'wait_timeout',
      endedAt: at('20:30'),
    });
  });

  it('long break replaces the short break after every N focus phases', () => {
    const cfg = { ...P25, long_break_min: 15, long_break_every: 2 };
    const { state } = run(startSolo(cfg, at('20:00')), [
      ['20:25', 'tick'],
      ['20:30', 'tick'],
      ['20:30', { action: 'continue' }],
      ['20:55', 'tick'],
    ]);
    expect(state).toMatchObject({
      phase: 'long_break',
      phaseEndsAt: at('21:10'),
    });
  });

  it('4.9.1: pause freezes the clock and credits the focus so far; resume keeps the remaining time', () => {
    const { state, total } = run(startSolo(P25, at('20:00')), [
      ['20:10', { action: 'pause' }],
      ['20:40', { action: 'resume' }],
    ]);
    expect(total).toBe(10);
    expect(state).toMatchObject({
      status: 'running',
      phase: 'focus',
      phaseEndsAt: at('20:55'),
    });
  });

  it('paused time is never credited, and the pause and stop stretches do not overlap', () => {
    const { credited, total } = run(startSolo(P25, at('20:00')), [
      ['20:10', { action: 'pause' }],
      ['20:40', { action: 'resume' }],
      ['20:45', { action: 'stop' }],
    ]);
    expect(total).toBe(15);
    expect(credited[1].start).toEqual(at('20:40'));
  });

  it('a paused session does not move on when its old phase end passes', () => {
    const { state } = run(startSolo(P25, at('20:00')), [
      ['20:10', { action: 'pause' }],
      ['23:00', 'tick'],
    ]);
    expect(state).toMatchObject({
      status: 'paused',
      pausedRemainingMs: 15 * 60_000,
    });
  });

  it('skip in focus keeps the focus done so far and goes to the break', () => {
    const { state, total } = run(startSolo(P25, at('20:00')), [
      ['20:07', { action: 'skip' }],
    ]);
    expect(total).toBe(7);
    expect(state).toMatchObject({
      phase: 'short_break',
      status: 'running',
      phaseEndsAt: at('20:12'),
      focusPhasesDone: 1,
    });
  });

  it('spec 04: skip in a break goes straight to focus, not through waiting', () => {
    const { state } = run(startSolo(P25, at('20:00')), [
      ['20:25', 'tick'],
      ['20:27', { action: 'skip' }],
    ]);
    expect(state).toMatchObject({
      phase: 'focus',
      status: 'running',
      phaseEndsAt: at('20:52'),
    });
  });

  it('skip while paused starts the next phase running', () => {
    const { state } = run(startSolo(P25, at('20:00')), [
      ['20:10', { action: 'pause' }],
      ['20:20', { action: 'skip' }],
    ]);
    expect(state).toMatchObject({
      phase: 'short_break',
      status: 'running',
      phaseEndsAt: at('20:25'),
    });
  });

  it('STUDY-11 AC6: a config change keeps the current phase and applies from the next one', () => {
    const { state } = run(startSolo(P25, at('20:00')), [
      [
        '20:20',
        {
          action: 'config',
          cycle_config: { focus_min: 50, short_break_min: 10 },
        },
      ],
    ]);
    expect(state).toMatchObject({
      phaseEndsAt: at('20:25'),
      nextConfig: { focus_min: 50 },
    });
    const next = advance(state, at('20:25')).state;
    expect(next).toMatchObject({
      phase: 'short_break',
      phaseEndsAt: at('20:35'),
      config: { focus_min: 50 },
      nextConfig: null,
    });
  });

  it('a config chosen while waiting applies to the focus started by "Học tiếp"', () => {
    const { state } = run(startSolo(P25, at('20:00')), [
      ['20:31', 'tick'],
      [
        '20:32',
        {
          action: 'config',
          cycle_config: { focus_min: 50, short_break_min: 10 },
        },
      ],
      ['20:33', { action: 'continue' }],
    ]);
    expect(state).toMatchObject({ phase: 'focus', phaseEndsAt: at('21:23') });
  });

  it('replayed actions that already took effect are no-ops (offline resend)', () => {
    const { state, total } = run(startSolo(P25, at('20:00')), [
      ['20:10', { action: 'pause' }],
      ['20:11', { action: 'pause' }],
      ['20:12', { action: 'resume' }],
      ['20:13', { action: 'resume' }],
      ['20:14', { action: 'stop' }],
      ['20:15', { action: 'stop' }],
    ]);
    expect(total).toBe(12);
    expect(state.endedAt).toEqual(at('20:14'));
  });

  it('a repeated "Học tiếp" on the new focus phase is a no-op', () => {
    const { state } = run(startSolo(P25, at('20:00')), [
      ['20:31', 'tick'],
      ['20:32', { action: 'continue' }],
      ['20:33', { action: 'continue' }],
    ]);
    expect(state).toMatchObject({ phase: 'focus', phaseEndsAt: at('20:57') });
  });

  it.each([
    ['continue while running a break', [['20:26', { action: 'continue' }]]],
    ['skip while waiting', [['20:31', { action: 'skip' }]]],
    ['pause while waiting', [['20:31', { action: 'pause' }]]],
    [
      'config after the end',
      [
        ['20:10', { action: 'stop' }],
        ['20:11', { action: 'config', cycle_config: P25 }],
      ],
    ],
    [
      'resume after the end',
      [
        ['20:10', { action: 'stop' }],
        ['20:11', { action: 'resume' }],
      ],
    ],
  ] as const)('%s is 40901', (_, steps) => {
    const first = advance(startSolo(P25, at('20:00')), at('20:25')).state;
    expect(() => run(first, steps as never)).toThrow(
      expect.objectContaining({ code: ErrorCode.Conflict }),
    );
  });
});
