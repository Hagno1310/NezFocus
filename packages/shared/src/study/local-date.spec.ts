import { addDays, periodOf, previousPeriod } from './local-date.js';

describe('local dates', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-10-18', 1)).toBe('2026-10-19');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('a week is Monday–Sunday, a month the calendar month', () => {
    expect(periodOf('week', '2026-10-18')).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    });
    expect(periodOf('week', '2026-10-12')).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    });
    expect(periodOf('week', '2026-01-01')).toEqual({
      from: '2025-12-29',
      to: '2026-01-04',
    });
    expect(periodOf('month', '2026-02-10')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('REQ-STUDY-17 AC1: a running period compares with the same first days', () => {
    // Wednesday 14/10 → Mon–Wed of the week before.
    const week = periodOf('week', '2026-10-14');
    expect(previousPeriod('week', week, '2026-10-14')).toEqual({
      from: '2026-10-05',
      to: '2026-10-07',
    });
    // 18/10 → 1–18/9.
    const month = periodOf('month', '2026-10-18');
    expect(previousPeriod('month', month, '2026-10-18')).toEqual({
      from: '2026-09-01',
      to: '2026-09-18',
    });
    // 31/3 → all of February.
    expect(
      previousPeriod('month', periodOf('month', '2026-03-31'), '2026-03-31'),
    ).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    // A past week compares with the whole week before.
    expect(
      previousPeriod('week', periodOf('week', '2026-10-05'), '2026-10-18'),
    ).toEqual({ from: '2026-09-28', to: '2026-10-04' });
  });
});
