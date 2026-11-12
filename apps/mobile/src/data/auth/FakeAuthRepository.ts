import {
  checkPassword,
  EMAIL_CODE_RESEND_SECONDS,
  ErrorCode,
  type CurrentUser,
} from '@nezfocus/shared';
import type { AuthRepository } from '../../domain/auth/AuthRepository';
import { ApiError } from '../api/client';

// EXPO_PUBLIC_FAKE=auth (WORKFLOW 4.2): An + usernames from screens/README.md, codes from spec 01.
const AN_EMAIL = 'an.nguyen@gmail.com'; // completed account; any other email = new, incomplete
export const FAKE_CODE = '482913'; // spec 01 › Dữ liệu mẫu; any other code → 40003
export const FAKE_EXPIRED_CODE = '000015'; // shows code-expired (40002)
export const FAKE_PASSWORD = 'NezFocus@2026'; // An's only password; anything else → 40102
const TAKEN = new Set(['an', 'an.nguyen', 'binh.tran', 'chi.le', 'dung.pham']);
const MAX_WRONG_CODES = 5;
const MAX_SENDS_PER_DAY = 10;
const MAX_WRONG_PASSWORDS = 5;
const LOGIN_WAIT_SECONDS = 600;
const DAY_SECONDS = 24 * 60 * 60;
const MAX_RESETS_PER_HOUR = 3; // AUTH-08 AC5
const HOUR_MS = 60 * 60 * 1000;

const fail = (status: number, code: number, extra = {}) =>
  new ApiError(status, { code, message: `fake ${code}`, ...extra });

const userFor = (email: string): CurrentUser =>
  email === AN_EMAIL
    ? {
        id: '1',
        email,
        username: 'an.nguyen',
        display_name: 'An',
        bio: null,
        avatar: null,
        account_completed: true,
        created_at: '2026-10-01T08:00:00.000Z',
      }
    : {
        id: '2',
        email,
        username: null,
        display_name: null,
        bio: null,
        avatar: null,
        account_completed: false,
        created_at: '2026-10-18T14:47:00.000Z',
      };

const session = (user: CurrentUser) => ({
  access_token: 'fake-access',
  refresh_token: 'fake-refresh',
  expires_in: 900,
  session_id: '100',
  user,
});

const norm = (email: string) => email.trim().toLowerCase();

export function createFakeAuthRepository(
  delayMs = 300,
  now: () => number = Date.now,
): AuthRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const codes = new Map<string, { attemptsLeft: number }>();
  const sends = new Map<string, { last: number; today: number }>();
  let wrongPasswords = 0;
  let lockedUntil = 0;
  let current: CurrentUser | null = null;
  let anPassword = FAKE_PASSWORD; // a reset changes it
  // AUTH-08: a reset code of its own (AUTH-02 AC7), sent to every email, mailed only to An.
  const resetCodes = new Map<string, { attemptsLeft: number }>();
  const resetSends = new Map<string, number[]>(); // send times, newest last

  return {
    async sendEmailCode(raw) {
      await wait();
      const email = norm(raw);
      const sent = sends.get(email) ?? { last: -Infinity, today: 0 };
      const sinceLast = (now() - sent.last) / 1000;
      if (sinceLast < EMAIL_CODE_RESEND_SECONDS)
        throw fail(429, ErrorCode.RateLimited, {
          retry_after: Math.ceil(EMAIL_CODE_RESEND_SECONDS - sinceLast),
        });
      if (sent.today >= MAX_SENDS_PER_DAY)
        throw fail(429, ErrorCode.RateLimited, { retry_after: DAY_SECONDS });
      sends.set(email, { last: now(), today: sent.today + 1 });
      codes.set(email, { attemptsLeft: MAX_WRONG_CODES });
      return { expires_in: 900, resend_in: EMAIL_CODE_RESEND_SECONDS };
    },
    async verifyEmailCode(raw, code) {
      await wait();
      const email = norm(raw);
      const entry = codes.get(email) ?? { attemptsLeft: MAX_WRONG_CODES };
      if (entry.attemptsLeft <= 0 || code === FAKE_EXPIRED_CODE)
        throw fail(400, ErrorCode.TokenLinkInvalid);
      if (code !== FAKE_CODE) {
        entry.attemptsLeft -= 1;
        codes.set(email, entry);
        throw fail(400, ErrorCode.VerificationCodeInvalid, {
          attempts_left: entry.attemptsLeft,
        });
      }
      codes.delete(email);
      current = userFor(email);
      return {
        ...session(current),
        suggested_username: current.account_completed
          ? null
          : email.split('@')[0]!,
      };
    },
    async login(email, password) {
      await wait();
      if (now() < lockedUntil)
        throw fail(429, ErrorCode.RateLimited, {
          retry_after: Math.ceil((lockedUntil - now()) / 1000),
        });
      if (norm(email) !== AN_EMAIL || password !== anPassword) {
        wrongPasswords += 1;
        if (wrongPasswords >= MAX_WRONG_PASSWORDS) {
          wrongPasswords = 0;
          lockedUntil = now() + LOGIN_WAIT_SECONDS * 1000;
        }
        throw fail(401, ErrorCode.InvalidCredentials);
      }
      wrongPasswords = 0;
      current = userFor(AN_EMAIL);
      return session(current);
    },
    async usernameAvailable(username) {
      await wait();
      return !TAKEN.has(username.trim().toLowerCase());
    },
    async completeAccount(body) {
      await wait();
      if (TAKEN.has(body.username))
        throw fail(409, ErrorCode.Conflict, {
          errors: { username: [{ code: 'TAKEN', message: 'taken' }] },
        });
      if (!current) throw fail(401, ErrorCode.TokenInvalid); // needs a session, like the real API
      current = {
        ...current,
        username: body.username,
        display_name: body.display_name,
        bio: null,
        avatar: null,
        account_completed: true,
      };
      return current;
    },
    async logout() {
      current = null;
    },
    async forgotPassword(raw) {
      await wait();
      const email = norm(raw);
      const recent = (resetSends.get(email) ?? []).filter(
        (t) => now() - t < HOUR_MS,
      );
      const sinceLast = (now() - (recent.at(-1) ?? -Infinity)) / 1000;
      if (sinceLast < EMAIL_CODE_RESEND_SECONDS)
        throw fail(429, ErrorCode.RateLimited, {
          retry_after: Math.ceil(EMAIL_CODE_RESEND_SECONDS - sinceLast),
        });
      if (recent.length >= MAX_RESETS_PER_HOUR)
        throw fail(429, ErrorCode.RateLimited, {
          retry_after: Math.ceil((recent[0]! + HOUR_MS - now()) / 1000),
        });
      resetSends.set(email, [...recent, now()]);
      resetCodes.set(email, { attemptsLeft: MAX_WRONG_CODES });
      return { expires_in: 900, resend_in: EMAIL_CODE_RESEND_SECONDS };
    },
    // Like the backend: the code first, then the account and the password rules.
    async resetPassword(raw, code, password) {
      await wait();
      const email = norm(raw);
      const entry = resetCodes.get(email);
      if (!entry || entry.attemptsLeft <= 0 || code === FAKE_EXPIRED_CODE)
        throw fail(400, ErrorCode.TokenLinkInvalid);
      if (code !== FAKE_CODE) {
        entry.attemptsLeft -= 1;
        throw fail(400, ErrorCode.VerificationCodeInvalid, {
          attempts_left: entry.attemptsLeft,
        });
      }
      if (email !== AN_EMAIL) {
        resetCodes.delete(email);
        throw fail(400, ErrorCode.TokenLinkInvalid);
      }
      const issues = checkPassword(password, { email, username: 'an.nguyen' });
      if (issues.length)
        throw fail(400, ErrorCode.ValidationError, {
          errors: { password: issues.map((i) => ({ code: i, message: i })) },
        });
      resetCodes.delete(email);
      anPassword = password;
      wrongPasswords = 0;
      current = userFor(AN_EMAIL);
      return session(current);
    },
  };
}

export const fakeAuthRepository = createFakeAuthRepository();
