import { EMAIL_CODE_RESEND_SECONDS, Email, ErrorCode } from '@nezfocus/shared';
import type { EndReason } from '../session/sessionStore';

// Spec 01: what each auth error means on screen. Errors are ApiError (data/api) or a fetch
// failure; only the API body fields are read so domain/ stays free of data/.
type ApiErrorLike = {
  code: number;
  attempts_left?: number;
  retry_after?: number | null;
};

const asApiError = (err: unknown): ApiErrorLike | null =>
  typeof err === 'object' &&
  err !== null &&
  typeof (err as ApiErrorLike).code === 'number'
    ? (err as ApiErrorLike)
    : null;

export type SignInMode = 'otp' | 'password';

export function checkEmail(
  raw: string,
): { email: string } | { error: 'empty' | 'invalid' } {
  if (!raw.trim()) return { error: 'empty' };
  const parsed = Email.safeParse(raw);
  return parsed.success ? { email: parsed.data } : { error: 'invalid' };
}

export type SendCodeErrorState =
  | { kind: 'invalid-email' }
  | { kind: 'rate-limited' } // 10 codes today (AUTH-13 AC6)
  | { kind: 'wait'; seconds: number } // the 1-minute limit: just restart the countdown
  | { kind: 'network' }
  | { kind: 'other' };

export function sendCodeErrorState(err: unknown): SendCodeErrorState {
  const e = asApiError(err);
  if (!e) return { kind: 'network' };
  if (e.code === ErrorCode.ValidationError) return { kind: 'invalid-email' };
  if (e.code === ErrorCode.RateLimited) {
    const seconds = e.retry_after ?? 0;
    return seconds > EMAIL_CODE_RESEND_SECONDS
      ? { kind: 'rate-limited' }
      : { kind: 'wait', seconds };
  }
  return { kind: 'other' };
}

export type CodeErrorState =
  | { kind: 'code-wrong'; attemptsLeft: number }
  | { kind: 'too-many-attempts' }
  | { kind: 'code-expired' }
  | { kind: 'network' }
  | { kind: 'other' };

export function codeErrorState(err: unknown): CodeErrorState {
  const e = asApiError(err);
  if (!e) return { kind: 'network' };
  if (e.code === ErrorCode.VerificationCodeInvalid) {
    const attemptsLeft = e.attempts_left ?? 0;
    return attemptsLeft > 0
      ? { kind: 'code-wrong', attemptsLeft }
      : { kind: 'too-many-attempts' };
  }
  if (e.code === ErrorCode.TokenLinkInvalid) return { kind: 'code-expired' };
  return { kind: 'other' };
}

export type LoginErrorState =
  | { kind: 'wrong-password' }
  | { kind: 'rate-limited'; until: number }
  | { kind: 'invalid-email' }
  | { kind: 'network' }
  | { kind: 'other' };

export function loginErrorState(err: unknown, now: number): LoginErrorState {
  const e = asApiError(err);
  if (!e) return { kind: 'network' };
  if (e.code === ErrorCode.InvalidCredentials)
    return { kind: 'wrong-password' };
  if (e.code === ErrorCode.ValidationError) return { kind: 'invalid-email' };
  if (e.code === ErrorCode.RateLimited)
    return { kind: 'rate-limited', until: now + (e.retry_after ?? 60) * 1000 };
  return { kind: 'other' };
}

export const secondsLeft = (until: number, now: number) =>
  Math.max(0, Math.ceil((until - now) / 1000));

export const countdownText = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// The last code this device asked for; "Tiếp tục" with the same email before the
// minute is up goes straight to S-AUTH-03 without a new email (spec 01 › S-AUTH-02).
export type SentCode = { email: string; resendAt: number };

export const canReuseCode = (
  last: SentCode | null,
  email: string,
  now: number,
) => !!last && last.email === email && now < last.resendAt;

// Spec 01 › Phiên đăng nhập kết thúc: a password change opens the password mode.
export const signInModeAfterEnd = (
  reason: EndReason | null,
  remembered: SignInMode | null,
): SignInMode =>
  reason === 'password_reset' ? 'password' : (remembered ?? 'otp');
