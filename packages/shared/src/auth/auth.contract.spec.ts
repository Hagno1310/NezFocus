import {
  CompleteAccountRequest,
  SendEmailCodeRequest,
  TERMS_VERSION,
  VerifyEmailCodeRequest,
} from './auth.contract.js';

const device = { id: 'c0ffee00-device', name: 'Pixel 7' };

const validCompletion = {
  display_name: 'An Nguyễn',
  username: 'an.nguyen',
  password: 'Ontap2026!',
  timezone: 'Asia/Ho_Chi_Minh',
  locale: 'vi',
  age_confirmed: true,
  terms_accepted: true,
  terms_version: TERMS_VERSION,
};

// Field → issue codes, the way the backend turns them into `errors.<field>[]`.
const issueCodes = (input: unknown) => {
  const result = CompleteAccountRequest.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const code =
      issue.code === 'custom'
        ? String((issue.params as { code?: string } | undefined)?.code)
        : issue.code;
    (out[issue.path.join('.')] ??= []).push(code);
  }
  return out;
};

describe('auth contract', () => {
  it('normalizes the email to lowercase', () => {
    const parsed = SendEmailCodeRequest.parse({
      email: '  An.Nguyen@Gmail.com ',
      device,
    });
    expect(parsed.email).toBe('an.nguyen@gmail.com');
  });

  it('requires a 6-digit code', () => {
    const base = { email: 'an@gmail.com', device };
    expect(
      VerifyEmailCodeRequest.safeParse({ ...base, code: '123456' }).success,
    ).toBe(true);
    expect(
      VerifyEmailCodeRequest.safeParse({ ...base, code: '12345' }).success,
    ).toBe(false);
    expect(
      VerifyEmailCodeRequest.safeParse({ ...base, code: '12345a' }).success,
    ).toBe(false);
  });

  describe('CompleteAccountRequest', () => {
    it('accepts a valid completion and lowercases the username', () => {
      const parsed = CompleteAccountRequest.parse({
        ...validCompletion,
        username: 'An.Nguyen',
      });
      expect(parsed.username).toBe('an.nguyen');
    });

    it('reports the username rule (AUTH-01 AC3)', () => {
      expect(
        issueCodes({ ...validCompletion, username: 'Nez Focus!' }),
      ).toEqual({ username: ['INVALID_CHARS'] });
    });

    it('reports every missing password condition (AUTH-01 AC4b)', () => {
      expect(issueCodes({ ...validCompletion, password: 'ontap2026' })).toEqual(
        { password: ['MISSING_UPPERCASE', 'MISSING_SPECIAL'] },
      );
    });

    it('requires agreeing to the terms and confirming 18+ (AUTH-01 AC4)', () => {
      expect(
        Object.keys(issueCodes({ ...validCompletion, terms_accepted: false })),
      ).toEqual(['terms_accepted']);
      expect(
        Object.keys(issueCodes({ ...validCompletion, age_confirmed: false })),
      ).toEqual(['age_confirmed']);
    });

    it('only accepts the current terms version', () => {
      expect(
        Object.keys(
          issueCodes({ ...validCompletion, terms_version: '2020-01-01' }),
        ),
      ).toEqual(['terms_version']);
    });

    it('requires a display name of 1–32 characters', () => {
      expect(
        Object.keys(issueCodes({ ...validCompletion, display_name: '   ' })),
      ).toEqual(['display_name']);
      expect(
        Object.keys(
          issueCodes({ ...validCompletion, display_name: 'a'.repeat(33) }),
        ),
      ).toEqual(['display_name']);
    });
  });
});
