import { describe, expect, it } from 'vitest';
import { acceptsDmVia } from './settings.rules.js';

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
