import { creditFocus } from './focused-time.js';

const HCM = 'Asia/Ho_Chi_Minh'; // UTC+7, no DST
const at = (iso: string) => new Date(iso);
// Interval starting at `start` and lasting `m:s` on the backend clock.
const focus = (start: string, m: number, s = 0) => ({
  start: at(start),
  end: new Date(at(start).getTime() + (m * 60 + s) * 1000),
});

describe('creditFocus', () => {
  it('AC5: leaving at 12:40 of a focus phase credits 760 seconds', () => {
    expect(
      creditFocus([focus('2026-11-06T13:00:00Z', 12, 40)], HCM, {}),
    ).toEqual([{ localDate: '2026-11-06', seconds: 760 }]);
  });

  it('AC6: five exits at 2:59 add up to 14:55, not 10 minutes', () => {
    const exits = [0, 1, 2, 3, 4].map((h) =>
      focus(`2026-11-06T0${h}:00:00Z`, 2, 59),
    );
    expect(creditFocus(exits, HCM, {})).toEqual([
      { localDate: '2026-11-06', seconds: 895 },
    ]);
  });

  it('(4) splits a phase crossing local midnight between the two days', () => {
    // 23:50 → 00:15 in Ho Chi Minh City.
    expect(creditFocus([focus('2026-11-06T16:50:00Z', 25)], HCM, {})).toEqual([
      { localDate: '2026-11-06', seconds: 600 },
      { localDate: '2026-11-07', seconds: 900 },
    ]);
  });

  it('(4) uses the user timezone for the day boundary', () => {
    // Same instants are 11:50 → 12:15 in New York: one day.
    expect(
      creditFocus([focus('2026-11-06T16:50:00Z', 25)], 'America/New_York', {}),
    ).toEqual([{ localDate: '2026-11-06', seconds: 1500 }]);
  });

  it('(4) credits only up to 16 hours per local day', () => {
    const already = { '2026-11-06': 15 * 3600 + 50 * 60 };
    expect(
      creditFocus([focus('2026-11-06T08:00:00Z', 25)], HCM, already),
    ).toEqual([{ localDate: '2026-11-06', seconds: 600 }]);
  });

  it('(4) a full day credits nothing but the next day still counts', () => {
    const already = { '2026-11-06': 16 * 3600 };
    expect(
      creditFocus([focus('2026-11-06T16:50:00Z', 25)], HCM, already),
    ).toEqual([{ localDate: '2026-11-07', seconds: 900 }]);
  });

  it('AC3/AC4: a stop arriving an hour late is clipped to the phase schedule', () => {
    // Solo focus 25 min from 20:00; the backend receives stop at 21:25 (85 min).
    const late = {
      ...focus('2026-11-06T13:00:00Z', 85),
      phaseEndsAt: focus('2026-11-06T13:00:00Z', 25).end,
    };
    expect(creditFocus([late], HCM, {})).toEqual([
      { localDate: '2026-11-06', seconds: 1500 },
    ]);
  });

  it('(1) a stop before the phase ends keeps the partial phase', () => {
    const early = {
      ...focus('2026-11-06T13:00:00Z', 7, 30),
      phaseEndsAt: focus('2026-11-06T13:00:00Z', 25).end,
    };
    expect(creditFocus([early], HCM, {})).toEqual([
      { localDate: '2026-11-06', seconds: 450 },
    ]);
  });
});
