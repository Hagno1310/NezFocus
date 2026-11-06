import { DAILY_FOCUS_CAP_SECONDS, toFocusedMinutes } from './focused-time.js';

describe('toFocusedMinutes', () => {
  it('rounds down for display and thresholds (REQ-STUDY-15 AC5, AC6)', () => {
    expect(toFocusedMinutes(760)).toBe(12);
    expect(toFocusedMinutes(895)).toBe(14);
    expect(toFocusedMinutes(59)).toBe(0);
    expect(toFocusedMinutes(900)).toBe(15);
  });

  it('caps a day at 16 hours', () => {
    expect(toFocusedMinutes(DAILY_FOCUS_CAP_SECONDS)).toBe(16 * 60);
  });
});
