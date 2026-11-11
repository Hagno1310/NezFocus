import { ErrorCode, type CompleteAccountRequest } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { AuthRepository } from './AuthRepository';
import {
  finishAccount,
  logIn,
  requestCode,
  usernameStatus,
  verifyCode,
} from './signIn';

const NOW = 1_000_000;
const clock = () => NOW;
const apiError = (code: number, extra = {}) =>
  Object.assign(new Error('x'), { code, ...extra });
const user = {
  id: '1',
  email: 'an.nguyen@gmail.com',
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
const repo = (over: Partial<AuthRepository>): AuthRepository => ({
  sendEmailCode: async () => ({ expires_in: 900, resend_in: 60 }),
  verifyEmailCode: async () => ({ ...session, suggested_username: null }),
  login: async () => session,
  usernameAvailable: async () => true,
  completeAccount: async () => user,
  logout: async () => {},
  forgotPassword: async () => ({ expires_in: 900, resend_in: 60 }),
  resetPassword: async () => session,
  ...over,
});
const body = {} as CompleteAccountRequest;

describe('requestCode (S-AUTH-02, AUTH-13)', () => {
  it('sends and remembers when "Gửi lại mã" opens', async () => {
    let sent = 0;
    const r = await requestCode(
      repo({
        sendEmailCode: async () => (sent++, { expires_in: 900, resend_in: 60 }),
      }),
      null,
      'an.nguyen@gmail.com',
      clock,
    );
    expect(sent).toBe(1);
    expect(r).toEqual({
      result: { ok: true, reused: false },
      sent: { email: 'an.nguyen@gmail.com', resendAt: NOW + 60_000 },
    });
  });

  it('the same email before the minute is up reuses the code without a request', async () => {
    const last = { email: 'an.nguyen@gmail.com', resendAt: NOW + 30_000 };
    const r = await requestCode(
      repo({ sendEmailCode: () => Promise.reject(new Error('no call')) }),
      last,
      'an.nguyen@gmail.com',
      clock,
    );
    expect(r).toEqual({ result: { ok: true, reused: true }, sent: last });
  });

  it('force skips the reuse (Gửi lại mã / Gửi mã OTP mới)', async () => {
    const last = { email: 'an.nguyen@gmail.com', resendAt: NOW + 30_000 };
    const r = await requestCode(repo({}), last, 'an.nguyen@gmail.com', clock, {
      force: true,
    });
    expect(r.result).toEqual({ ok: true, reused: false });
  });

  it('a minute limit from the backend restarts the countdown', async () => {
    const r = await requestCode(
      repo({
        sendEmailCode: () =>
          Promise.reject(apiError(ErrorCode.RateLimited, { retry_after: 41 })),
      }),
      null,
      'an.nguyen@gmail.com',
      clock,
    );
    expect(r).toEqual({
      result: { ok: false, error: { kind: 'wait', seconds: 41 } },
      sent: { email: 'an.nguyen@gmail.com', resendAt: NOW + 41_000 },
    });
  });
});

describe('verifyCode / logIn', () => {
  it('maps a wrong code to its screen state', async () => {
    const r = await verifyCode(
      repo({
        verifyEmailCode: () =>
          Promise.reject(
            apiError(ErrorCode.VerificationCodeInvalid, { attempts_left: 4 }),
          ),
      }),
      'an.nguyen@gmail.com',
      '482931',
    );
    expect(r).toEqual({
      ok: false,
      error: { kind: 'code-wrong', attemptsLeft: 4 },
    });
  });

  it('returns the session on the right password; 40102 is wrong-password', async () => {
    await expect(logIn(repo({}), 'a@b.co', 'x', clock)).resolves.toEqual({
      ok: true,
      session,
    });
    await expect(
      logIn(
        repo({
          login: () => Promise.reject(apiError(ErrorCode.InvalidCredentials)),
        }),
        'a@b.co',
        'x',
        clock,
      ),
    ).resolves.toEqual({ ok: false, error: { kind: 'wrong-password' } });
  });
});

describe('finishAccount (S-ONB-01)', () => {
  it('AC2: 40901 on username becomes a field error', async () => {
    const r = await finishAccount(
      repo({
        completeAccount: () =>
          Promise.reject(
            apiError(ErrorCode.Conflict, {
              errors: { username: [{ code: 'TAKEN', message: 'x' }] },
            }),
          ),
      }),
      body,
    );
    expect(r).toEqual({ ok: false, fields: { username: 'taken-on-submit' } });
  });

  it('an account completed on another phone counts as done', async () => {
    const r = await finishAccount(
      repo({
        completeAccount: () => Promise.reject(apiError(ErrorCode.Conflict)),
      }),
      body,
    );
    expect(r).toEqual({ ok: true, user: null });
  });

  it('other API errors and lost requests are told apart', async () => {
    await expect(
      finishAccount(
        repo({
          completeAccount: () =>
            Promise.reject(apiError(ErrorCode.InternalError)),
        }),
        body,
      ),
    ).resolves.toEqual({ ok: false, error: 'other' });
    await expect(
      finishAccount(
        repo({
          completeAccount: () => Promise.reject(new TypeError('Network')),
        }),
        body,
      ),
    ).resolves.toEqual({ ok: false, error: 'network' });
  });
});

describe('usernameStatus (S-ONB-01, AUTH-01 AC2)', () => {
  it('asks the backend only for a username that follows DEC-03', async () => {
    const asked: string[] = [];
    const r = repo({
      usernameAvailable: async (u) => (asked.push(u), u !== 'an'),
    });
    await expect(usernameStatus(r, 'An')).resolves.toBe('taken');
    await expect(usernameStatus(r, 'an.nguyen')).resolves.toBe('available');
    await expect(usernameStatus(r, 'nez focus!')).resolves.toBe('idle');
    expect(asked).toEqual(['an', 'an.nguyen']);
  });
});
