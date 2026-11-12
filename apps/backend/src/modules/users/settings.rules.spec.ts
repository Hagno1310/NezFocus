import { describe, expect, it } from 'vitest';
import { acceptsDmVia, timezoneLockedUntil } from './settings.rules.js';

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

describe('acceptsDmVia (REQ-DM-02)', () => {
  const S1 = '1';
  const S2 = '2';

  it('switch on, no override → accepts members of any shared server', () => {
    expect(acceptsDmVia({ allow: true, overrides: {} }, [S1])).toBe(true);
  });

  it('switch off → nobody through servers, overrides ignored', () => {
    expect(
      acceptsDmVia({ allow: false, overrides: { [S1]: true } }, [S1]),
    ).toBe(false);
  });

  it('turned off in one server → its members are refused', () => {
    expect(
      acceptsDmVia({ allow: true, overrides: { [S1]: false } }, [S1]),
    ).toBe(false);
  });

  it('a second shared server still allowed → accepted', () => {
    expect(
      acceptsDmVia({ allow: true, overrides: { [S1]: false } }, [S1, S2]),
    ).toBe(true);
  });

  it('AC2: no shared server → refused', () => {
    expect(acceptsDmVia({ allow: true, overrides: {} }, [])).toBe(false);
  });
});
