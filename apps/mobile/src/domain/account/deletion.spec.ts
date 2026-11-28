import { describe, expect, it } from 'vitest';
import { deletionDay } from './deletion';

describe('deletionDay (REQ-AUTH-10, spec 01 / 07)', () => {
  const now = Date.parse('2026-10-18T13:12:00Z'); // 20:12 Hồ Chí Minh
  it('asked today → "01/11/2026", 14 days left', () => {
    expect(
      deletionDay('2026-11-01T13:12:00Z', now, 'Asia/Ho_Chi_Minh'),
    ).toEqual({ date: '01/11/2026', days: 14 });
  });
  it('the day follows the time zone; never under 1 day', () => {
    expect(
      deletionDay('2026-10-18T18:00:00Z', now, 'Asia/Ho_Chi_Minh'),
    ).toEqual({ date: '19/10/2026', days: 1 });
  });
});
