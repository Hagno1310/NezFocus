import { ErrorCode, type CurrentUser } from '@nezfocus/shared';
import type { AuthRepository } from '../../domain/auth/AuthRepository';
import { ApiError } from '../api/client';

// EXPO_PUBLIC_FAKE=auth (WORKFLOW 4.2): An + usernames from screens/README.md, email from spec 01.
const AN_EMAIL = 'an.nguyen@gmail.com'; // completed account; any other email = new, incomplete
export const FAKE_CODE = '123456'; // any other code → 40003, attempts_left counts down
export const FAKE_PASSWORD = 'NezFocus@2026'; // An's only password; anything else → 40102
const TAKEN = new Set(['an.nguyen', 'binh.tran', 'chi.le', 'dung.pham']);

const fail = (status: number, code: number, extra = {}) =>
  new ApiError(status, { code, message: `fake ${code}`, ...extra });

const userFor = (email: string): CurrentUser =>
  email === AN_EMAIL
    ? {
        id: '1',
        email,
        username: 'an.nguyen',
        display_name: 'An',
        account_completed: true,
        created_at: '2026-10-01T08:00:00.000Z',
      }
    : {
        id: '2',
        email,
        username: null,
        display_name: null,
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

export function createFakeAuthRepository(delayMs = 300): AuthRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  let attemptsLeft = 5;
  let current: CurrentUser | null = null;

  return {
    async sendEmailCode() {
      await wait();
      attemptsLeft = 5;
      return { expires_in: 900, resend_in: 60 };
    },
    async verifyEmailCode(email, code) {
      await wait();
      if (code !== FAKE_CODE) {
        attemptsLeft -= 1;
        throw fail(400, ErrorCode.VerificationCodeInvalid, {
          attempts_left: attemptsLeft,
        });
      }
      current = userFor(email.trim().toLowerCase());
      const local = current.email.split('@')[0];
      return {
        ...session(current),
        suggested_username: current.account_completed ? null : local,
      };
    },
    async login(email, password) {
      await wait();
      if (email.trim().toLowerCase() !== AN_EMAIL || password !== FAKE_PASSWORD)
        throw fail(401, ErrorCode.InvalidCredentials);
      current = userFor(AN_EMAIL);
      return session(current);
    },
    async usernameAvailable(username) {
      await wait();
      return !TAKEN.has(username.trim().toLowerCase());
    },
    async completeAccount(body) {
      await wait();
      if (TAKEN.has(body.username)) throw fail(409, ErrorCode.Conflict);
      if (!current) throw fail(401, ErrorCode.TokenInvalid); // needs a session, like the real API
      current = {
        ...current,
        username: body.username,
        display_name: body.display_name,
        account_completed: true,
      };
      return current;
    },
    async logout() {
      current = null;
    },
  };
}

export const fakeAuthRepository = createFakeAuthRepository();
