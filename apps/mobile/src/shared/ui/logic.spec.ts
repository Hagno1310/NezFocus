import { describe, expect, it } from 'vitest';
import {
  arcDash,
  clockText,
  dialogLayout,
  nextCode,
  passwordRuleStates,
  CODE_LENGTH,
} from './logic';

describe('passwordRuleStates (C-02 › PasswordRules)', () => {
  it('marks each rule met or unmet while typing', () => {
    expect(
      passwordRuleStates(['MISSING_UPPERCASE', 'MISSING_SPECIAL'], false),
    ).toEqual([
      ['TOO_SHORT', 'met'],
      ['MISSING_UPPERCASE', 'unmet'],
      ['MISSING_LOWERCASE', 'met'],
      ['MISSING_DIGIT', 'met'],
      ['MISSING_SPECIAL', 'unmet'],
    ]);
  });

  it('turns unmet rules into errors after submit (S-ONB-01 field-error)', () => {
    const states = passwordRuleStates(['MISSING_UPPERCASE'], true);
    expect(states.find(([r]) => r === 'MISSING_UPPERCASE')?.[1]).toBe('error');
    expect(states.find(([r]) => r === 'TOO_SHORT')?.[1]).toBe('met');
  });

  it('ignores issues that are not in the grid (CR-16: same-as-email shows under the field)', () => {
    const states = passwordRuleStates(
      ['SAME_AS_PERSONAL_INFO', 'TOO_LONG'],
      true,
    );
    expect(states.every(([, s]) => s === 'met')).toBe(true);
  });
});

describe('nextCode (C-24 CodeInput)', () => {
  it('keeps digits only, up to 6', () => {
    expect(CODE_LENGTH).toBe(6);
    expect(nextCode('', '48 2-913 77', false)).toBe('482913');
  });

  it('accepts a pasted or OS-suggested full code in one go', () => {
    expect(nextCode('', '482913', false)).toBe('482913');
  });

  it('after an error, typing a new digit clears and starts again', () => {
    expect(nextCode('482913', '4829137', true)).toBe('7');
  });

  it('after an error, a pasted full code replaces the old one', () => {
    expect(nextCode('482913', '105264', true)).toBe('105264');
  });

  it('after an error, backspace clears everything', () => {
    expect(nextCode('482913', '48291', true)).toBe('');
  });
});

describe('dialogLayout (C-09 › Nút của Dialog)', () => {
  it('two short buttons sit side by side', () => {
    expect(dialogLayout(['Hủy', 'Vào phòng'])).toBe('row');
  });

  it('a label longer than 2 words stacks the buttons full width', () => {
    expect(dialogLayout(['Để sau', 'Dừng phiên cho cả phòng'])).toBe('column');
  });

  it('a single button stacks full width', () => {
    expect(dialogLayout(['Đã hiểu'])).toBe('column');
  });
});

describe('arcDash', () => {
  it('draws one solid span from `from` to `to`', () => {
    expect(arcDash(100, 30, 100)).toEqual([0, 30, 70, 100]);
  });
  it('draws nothing for an empty span', () => {
    expect(arcDash(100, 40, 40)).toEqual([0, 100]);
  });
});

describe('clockText', () => {
  it('is mm:ss, rounding a part second up', () => {
    expect(clockText(32 * 60_000 + 9_400)).toBe('32:10');
    expect(clockText(0)).toBe('00:00');
    expect(clockText(120 * 60_000)).toBe('120:00');
  });
});
