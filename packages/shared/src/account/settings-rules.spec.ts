import { describe, expect, it } from 'vitest';
import { timezoneLockedUntil } from './settings-rules.js';

const at = (iso: string) => new Date(iso);

describe('timezoneLockedUntil (REQ-STUDY-03)', () => {
  it('AC7: never changed in Cài đặt (Complete account) → free now', () => {
    expect(timezoneLockedUntil(null, at('2026-10-18T13:12:00Z'))).toBeNull();
  });

  it('AC4: changed 2 hours ago → locked until 24 hours after that change', () => {
    expect(
      timezoneLockedUntil(
        at('2026-10-18T13:12:00Z'),
        at('2026-10-18T15:12:00Z'),
      ),
    ).toEqual(at('2026-10-19T13:12:00Z'));
  });

  it('exactly 24 hours later → free', () => {
    expect(
      timezoneLockedUntil(
        at('2026-10-18T13:12:00Z'),
        at('2026-10-19T13:12:00Z'),
      ),
    ).toBeNull();
  });
});
