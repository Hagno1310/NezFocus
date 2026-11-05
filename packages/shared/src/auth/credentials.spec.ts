import {
  checkPassword,
  checkUsername,
  normalizeUsername,
  suggestUsername,
} from './credentials.js';

describe('checkUsername (REQ-AUTH-01, DEC-03)', () => {
  it('rejects spaces and symbols (AC3)', () => {
    expect(checkUsername(normalizeUsername('Nez Focus!'))).toEqual([
      'INVALID_CHARS',
    ]);
  });

  it('accepts a-z0-9_. after lowercasing', () => {
    expect(normalizeUsername('  An.Nguyen_2026 ')).toBe('an.nguyen_2026');
    expect(checkUsername('an.nguyen_2026')).toEqual([]);
  });

  it('enforces 2–32 characters', () => {
    expect(checkUsername('a')).toEqual(['TOO_SHORT']);
    expect(checkUsername('ab')).toEqual([]);
    expect(checkUsername('a'.repeat(32))).toEqual([]);
    expect(checkUsername('a'.repeat(33))).toEqual(['TOO_LONG']);
  });

  it('rejects accented letters', () => {
    expect(checkUsername('bình')).toEqual(['INVALID_CHARS']);
  });
});

describe('checkPassword (REQ-AUTH-01)', () => {
  it('lists exactly the missing conditions (AC4b)', () => {
    expect(checkPassword('ontap2026')).toEqual([
      'MISSING_UPPERCASE',
      'MISSING_SPECIAL',
    ]);
  });

  it('accepts a password meeting every condition', () => {
    expect(checkPassword('Ontap2026!')).toEqual([]);
  });

  it('counts Vietnamese accented letters as letters with case', () => {
    expect(checkPassword('Ôntập2026!')).toEqual([]);
    expect(checkPassword('ôntập2026!')).toEqual(['MISSING_UPPERCASE']);
    expect(checkPassword('ÔNTẬP2026!')).toEqual(['MISSING_LOWERCASE']);
    // ệ is a letter, not a special character
    expect(checkPassword('Ontap2026ệ')).toEqual(['MISSING_SPECIAL']);
  });

  it('treats a space as a special character', () => {
    expect(checkPassword('Ontap 2026')).toEqual([]);
  });

  it('enforces 8–128 characters, counting code points', () => {
    expect(checkPassword('Ab1!xyz')).toEqual(['TOO_SHORT']);
    expect(checkPassword('Ab1!' + 'x'.repeat(124))).toEqual([]);
    expect(checkPassword('Ab1!' + 'x'.repeat(125))).toEqual(['TOO_LONG']);
    expect(checkPassword('Ab1!ệệệệ')).toEqual([]);
  });

  describe('must not be the username, email or email local part (AC6)', () => {
    const personal = {
      username: 'ontap_2026',
      email: 'an.nguyen2026@gmail.com',
    };

    it('rejects the username, ignoring case', () => {
      expect(checkPassword('Ontap_2026', personal)).toEqual([
        'SAME_AS_PERSONAL_INFO',
      ]);
    });

    it('rejects the email and the part before @, ignoring case', () => {
      expect(checkPassword('An.nguyen2026@gmail.com', personal)).toEqual([
        'SAME_AS_PERSONAL_INFO',
      ]);
      expect(checkPassword('An.Nguyen2026', personal)).toEqual([
        'SAME_AS_PERSONAL_INFO',
      ]);
    });

    it('accepts a password that only contains the username', () => {
      expect(checkPassword('Ontap_2026!x', personal)).toEqual([]);
    });
  });
});

describe('suggestUsername (REQ-AUTH-01)', () => {
  it('prefills from the part before @, normalized', () => {
    expect(suggestUsername('An.Nguyen2026@gmail.com')).toBe('an.nguyen2026');
    expect(suggestUsername('binh+study@ptit.edu.vn')).toBe('binhstudy');
  });

  it('cuts to 32 characters', () => {
    expect(suggestUsername('a'.repeat(40) + '@x.vn')).toBe('a'.repeat(32));
  });

  it('returns null when nothing valid is left', () => {
    expect(suggestUsername('+@x.vn')).toBeNull();
    expect(suggestUsername('a@x.vn')).toBeNull();
  });
});
