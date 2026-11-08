import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  canReuseCode,
  checkEmail,
  codeErrorState,
  countdownText,
  loginErrorState,
  secondsLeft,
  sendCodeErrorState,
  signInModeAfterEnd,
} from './authFlow';

const apiError = (code: number, extra = {}) => ({
  code,
  message: 'x',
  ...extra,
});
const NOW = Date.parse('2026-10-18T14:47:00Z');

describe('checkEmail (S-AUTH-02 field errors)', () => {
  it('empty and badly formed emails are field errors; a good one is normalized', () => {
    expect(checkEmail('  ')).toEqual({ error: 'empty' });
    expect(checkEmail('an.nguyen@gmail')).toEqual({ error: 'invalid' });
    expect(checkEmail(' An.Nguyen@Gmail.com ')).toEqual({
      email: 'an.nguyen@gmail.com',
    });
  });
});

describe('sendCodeErrorState', () => {
  it('40001 is the field error, 40029 for the day is rate-limited', () => {
    expect(sendCodeErrorState(apiError(ErrorCode.ValidationError))).toEqual({
      kind: 'invalid-email',
    });
    expect(
      sendCodeErrorState(
        apiError(ErrorCode.RateLimited, { retry_after: 20_000 }),
      ),
    ).toEqual({ kind: 'rate-limited' });
  });

  it('40029 without Retry-After is treated as the daily limit', () => {
    expect(sendCodeErrorState(apiError(ErrorCode.RateLimited))).toEqual({
      kind: 'rate-limited',
    });
  });

  it('40029 within the minute only restarts the countdown', () => {
    expect(
      sendCodeErrorState(apiError(ErrorCode.RateLimited, { retry_after: 41 })),
    ).toEqual({ kind: 'wait', seconds: 41 });
  });

  it('no API error at all means the request never arrived', () => {
    expect(sendCodeErrorState(new TypeError('Network request failed'))).toEqual(
      { kind: 'network' },
    );
    expect(sendCodeErrorState(apiError(ErrorCode.InternalError))).toEqual({
      kind: 'other',
    });
  });
});

describe('codeErrorState (S-AUTH-03, AUTH-13)', () => {
  it('AC2: a wrong code says how many tries are left; the fifth is too-many-attempts', () => {
    expect(
      codeErrorState(
        apiError(ErrorCode.VerificationCodeInvalid, { attempts_left: 4 }),
      ),
    ).toEqual({ kind: 'code-wrong', attemptsLeft: 4 });
    expect(
      codeErrorState(
        apiError(ErrorCode.VerificationCodeInvalid, { attempts_left: 0 }),
      ),
    ).toEqual({ kind: 'too-many-attempts' });
  });

  it('AC3: 40002 is code-expired', () => {
    expect(codeErrorState(apiError(ErrorCode.TokenLinkInvalid))).toEqual({
      kind: 'code-expired',
    });
  });

  it('a lost request is verify-network-error, not a wrong code', () => {
    expect(codeErrorState(new TypeError('Network request failed'))).toEqual({
      kind: 'network',
    });
  });
});

describe('resend countdown', () => {
  it('counts whole seconds down to 0 and prints m:ss', () => {
    expect(secondsLeft(NOW + 41_000, NOW)).toBe(41);
    expect(secondsLeft(NOW + 40_900, NOW)).toBe(40);
    expect(secondsLeft(NOW + 60_000 - 5, NOW)).toBe(59);
    expect(secondsLeft(NOW - 5, NOW)).toBe(0);
    expect(countdownText(41)).toBe('0:41');
    expect(countdownText(59)).toBe('0:59');
    expect(countdownText(600)).toBe('10:00');
  });

  it('the same email before the minute is up reuses the code; another email does not', () => {
    const last = { email: 'an.nguyen@gmail.com', resendAt: NOW + 30_000 };
    expect(canReuseCode(last, 'an.nguyen@gmail.com', NOW)).toBe(true);
    expect(canReuseCode(last, 'an.nguyen@gmial.com', NOW)).toBe(false);
    expect(canReuseCode(last, 'an.nguyen@gmail.com', NOW + 30_000)).toBe(false);
    expect(canReuseCode(null, 'an.nguyen@gmail.com', NOW)).toBe(false);
  });
});

describe('loginErrorState (S-AUTH-04, AUTH-02)', () => {
  it('40102 is wrong-password whatever was wrong', () => {
    expect(
      loginErrorState(apiError(ErrorCode.InvalidCredentials), NOW),
    ).toEqual({ kind: 'wrong-password' });
  });

  it('AC3: 40029 blocks until Retry-After runs out', () => {
    expect(
      loginErrorState(
        apiError(ErrorCode.RateLimited, { retry_after: 600 }),
        NOW,
      ),
    ).toEqual({ kind: 'rate-limited', until: NOW + 600_000 });
  });

  it('40001 is the email field error', () => {
    expect(loginErrorState(apiError(ErrorCode.ValidationError), NOW)).toEqual({
      kind: 'invalid-email',
    });
  });
});

describe('signInModeAfterEnd (spec 01 › Phiên đăng nhập kết thúc)', () => {
  it('a password change opens the password mode; otherwise the remembered mode', () => {
    expect(signInModeAfterEnd('password_reset', 'otp')).toBe('password');
    expect(signInModeAfterEnd('reuse_detected', 'otp')).toBe('otp');
    expect(signInModeAfterEnd('expired', 'password')).toBe('password');
    expect(signInModeAfterEnd(null, null)).toBe('otp');
  });
});
