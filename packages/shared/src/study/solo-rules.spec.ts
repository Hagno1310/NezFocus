import { breakAfter, phaseMinutes } from './solo-rules.js';

const cfg = {
  focus_min: 50,
  short_break_min: 10,
  long_break_min: 30,
  long_break_every: 4,
};

describe('solo rules (shared by the backend machine and the app)', () => {
  it('phase length comes from the cycle', () => {
    expect(phaseMinutes(cfg, 'focus')).toBe(50);
    expect(phaseMinutes(cfg, 'short_break')).toBe(10);
    expect(phaseMinutes(cfg, 'long_break')).toBe(30);
  });

  it('the long break follows every N-th focus; without long breaks it is always short', () => {
    expect([1, 2, 3, 4, 8].map((n) => breakAfter(cfg, n))).toEqual([
      'short_break',
      'short_break',
      'short_break',
      'long_break',
      'long_break',
    ]);
    expect(breakAfter({ focus_min: 25, short_break_min: 5 }, 4)).toBe(
      'short_break',
    );
  });
});
