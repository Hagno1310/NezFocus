import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { AuthRepository } from './AuthRepository';
import { resetFormErrors, resetPassword } from './resetPassword';
import { requestCode } from './signIn';

const NOW = 1_000_000;
const clock = () => NOW;
const EMAIL = 'an.nguyen@gmail.com';
const apiError = (code: number, extra = {}) =>
  Object.assign(new Error('x'), { code, ...extra });
const user = {
  id: '1',
  email: EMAIL,
  username: 'an.nguyen',
  display_name: 'An',
  bio: null,
  avatar: null,
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};
const session = {
  access_token: 'a',
  refresh_token: 'r',
  expires_in: 900,
  session_id: '100',
  user,
};
const noCall = () => Promise.reject(new Error('no call'));
const repo = (over: Partial<AuthRepository>): AuthRepository => ({
  sendEmailCode: noCall,
  verifyEmailCode: noCall,
  login: noCall,
  usernameAvailable: noCall,
  completeAccount: noCall,
  logout: noCall,
  forgotPassword: async () => ({ expires_in: 900, resend_in: 60 }),
  resetPassword: async () => session,
  ...over,
});
const form = { email: EMAIL, code: '482913', password: 'Ontap2026!' };

describe('requestCode for a reset (S-AUTH-05 request, AUTH-08)', () => {
  it('asks /auth/password/forgot, not the sign-in code', async () => {
    const asked: string[] = [];
    const r = await requestCode(
      repo({
        forgotPassword: async (e) => (
          asked.push(e),
          { expires_in: 900, resend_in: 60 }
        ),
      }),
      null,
      EMAIL,
      clock,
      { purpose: 'reset_password' },
    );
    expect(asked).toEqual([EMAIL]);
    expect(r.sent).toEqual({ email: EMAIL, resendAt: NOW + 60_000 });
  });

  it('AC5: the hourly limit is rate-limited with its wait; the minute limit only waits', async () => {
    const limited = (retry_after: number) =>
      requestCode(
        repo({
          forgotPassword: () =>
            Promise.reject(apiError(ErrorCode.RateLimited, { retry_after })),
        }),
        null,
        EMAIL,
        clock,
        { purpose: 'reset_password' },
      );
    expect((await limited(2_520)).result).toEqual({
      ok: false,
      error: { kind: 'rate-limited', retryAfter: 2_520 },
    });
    expect((await limited(41)).result).toEqual({
      ok: false,
      error: { kind: 'wait', seconds: 41 },
    });
  });
});

describe('resetFormErrors (S-AUTH-05 reset-form)', () => {
  it('a full code and a password that follows the rules pass', () => {
    expect(resetFormErrors(form)).toEqual({});
  });

  it('a short code and a weak password are both reported', () => {
    expect(
      resetFormErrors({ ...form, code: '4829', password: 'ontap2026' }),
    ).toEqual({ code: 'incomplete', password: 'rules' });
  });

  it('AC6: the email or its part before @ is same-email (rules first)', () => {
    const email = 'an.nguyen9!@x.co';
    for (const password of ['An.Nguyen9!', 'AN.nguyen9!@x.co'])
      expect(resetFormErrors({ email, code: '482913', password })).toEqual({
        password: 'same-email',
      });
    expect(resetFormErrors({ ...form, password: 'An.Nguyen' })).toEqual({
      password: 'rules',
    });
  });
});

describe('resetPassword (AUTH-08 AC3, AC4, AC6)', () => {
  const failing = (err: unknown) =>
    resetPassword(repo({ resetPassword: () => Promise.reject(err) }), form);

  it('AC4: the right code signs in', async () => {
    await expect(resetPassword(repo({}), form)).resolves.toEqual({
      ok: true,
      session,
    });
  });

  it('AC3: 40003 counts down, the fifth is too-many-attempts, 40002 is code-expired', async () => {
    await expect(
      failing(
        apiError(ErrorCode.VerificationCodeInvalid, { attempts_left: 4 }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'code-wrong', attemptsLeft: 4 },
    });
    await expect(
      failing(
        apiError(ErrorCode.VerificationCodeInvalid, { attempts_left: 0 }),
      ),
    ).resolves.toEqual({ ok: false, error: { kind: 'too-many-attempts' } });
    await expect(
      failing(apiError(ErrorCode.TokenLinkInvalid)),
    ).resolves.toEqual({ ok: false, error: { kind: 'code-expired' } });
    await expect(failing(new TypeError('Network'))).resolves.toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });

  it('AC6: SAME_AS_PERSONAL_INFO the phone did not see coming is the username', async () => {
    const personal = apiError(ErrorCode.ValidationError, {
      errors: { password: [{ code: 'SAME_AS_PERSONAL_INFO' }] },
    });
    await expect(failing(personal)).resolves.toEqual({
      ok: false,
      error: { kind: 'password', error: 'same-username' },
    });
    await expect(
      resetPassword(repo({ resetPassword: () => Promise.reject(personal) }), {
        email: 'an.nguyen9!@x.co',
        code: '482913',
        password: 'An.Nguyen9!',
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'password', error: 'same-email' },
    });
    await expect(
      failing(
        apiError(ErrorCode.ValidationError, {
          errors: { password: [{ code: 'TOO_SHORT' }] },
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'password', error: 'rules' },
    });
  });
});
