import {
  checkPassword,
  ErrorCode,
  type CurrentUser,
  type SessionInfo,
} from '@nezfocus/shared';
import type { AccountRepository } from '../../domain/account/AccountRepository';
import { ApiError } from '../api/client';
import { fakeUploadedUri } from '../attachments/FakeAttachmentRepository';
import {
  FAKE_CODE,
  FAKE_EXPIRED_CODE,
  FAKE_PASSWORD,
} from '../auth/FakeAuthRepository';

// EXPO_PUBLIC_FAKE=account (WORKFLOW 4.2): An and the sessions of spec 07 › Dữ liệu mẫu.
export const FAKE_ME: CurrentUser = {
  id: '1',
  email: 'an.nguyen@gmail.com',
  username: 'an.nguyen',
  display_name: 'An',
  bio: 'Sinh viên năm 3 PTIT · đang ôn Giải tích 2',
  avatar: null,
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};

const MAX_WRONG = 5;
const WAIT_SECONDS = 600;

const fail = (status: number, code: number, extra = {}) =>
  new ApiError(status, { code, message: `fake ${code}`, ...extra });

export function createFakeAccountRepository(
  delayMs = 300,
  now: () => number = Date.now,
): AccountRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const me = { ...FAKE_ME };
  let password = FAKE_PASSWORD;
  let wrongPasswords = 0;
  let lockedUntil = 0;
  let codeAttempts = MAX_WRONG;
  let sessions: SessionInfo[] = [
    {
      id: '100',
      device_name: 'Samsung Galaxy A54',
      platform: 'android',
      ip_prefix: '14.232.x.x',
      created_at: '2026-10-01T08:00:00.000Z',
      last_active_at: new Date(now()).toISOString(),
      current: true,
    },
    {
      id: '101',
      device_name: 'Xiaomi Redmi Note 12',
      platform: 'android',
      ip_prefix: '113.190.x.x',
      created_at: '2026-10-10T08:00:00.000Z',
      last_active_at: new Date(now() - 22 * 60 * 60 * 1000).toISOString(),
      current: false,
    },
  ];

  return {
    async me() {
      await wait();
      return { ...me };
    },
    async changePassword(body) {
      await wait();
      if (body.current_password !== undefined) {
        if (now() < lockedUntil)
          throw fail(429, ErrorCode.RateLimited, {
            retry_after: Math.ceil((lockedUntil - now()) / 1000),
          });
        if (body.current_password !== password) {
          wrongPasswords += 1;
          if (wrongPasswords >= MAX_WRONG) {
            wrongPasswords = 0;
            lockedUntil = now() + WAIT_SECONDS * 1000;
            throw fail(429, ErrorCode.RateLimited, {
              retry_after: WAIT_SECONDS,
            });
          }
          throw fail(401, ErrorCode.InvalidCredentials);
        }
      } else {
        // The reset code of AUTH-08 (sent by the fake auth repository's forgotPassword).
        if (codeAttempts <= 0 || body.code === FAKE_EXPIRED_CODE)
          throw fail(400, ErrorCode.TokenLinkInvalid);
        if (body.code !== FAKE_CODE) {
          codeAttempts -= 1;
          throw fail(400, ErrorCode.VerificationCodeInvalid, {
            attempts_left: codeAttempts,
          });
        }
      }
      const issues = checkPassword(body.new_password, me);
      if (issues.length)
        throw fail(400, ErrorCode.ValidationError, {
          errors: {
            new_password: issues.map((i) => ({ code: i, message: i })),
          },
        });
      password = body.new_password;
      wrongPasswords = 0;
      codeAttempts = MAX_WRONG;
      sessions = sessions.filter((s) => s.current);
    },
    async sessions() {
      await wait();
      return sessions.map((s) => ({ ...s }));
    },
    async revokeSession(id) {
      await wait();
      const target = sessions.find((s) => s.id === id && !s.current);
      if (!target) throw fail(404, ErrorCode.NotFound);
      sessions = sessions.filter((s) => s !== target);
    },
    async revokeOtherSessions() {
      await wait();
      sessions = sessions.filter((s) => s.current);
    },
    async updateProfile(body) {
      await wait();
      if (body.display_name !== undefined) me.display_name = body.display_name;
      if (body.bio !== undefined) me.bio = body.bio;
      if (body.avatar_attachment_id === null) me.avatar = null;
      else if (body.avatar_attachment_id !== undefined) {
        // The fake keeps the local file; avatarUri shows file:// URIs as they are.
        const uri = fakeUploadedUri(body.avatar_attachment_id);
        if (!uri) throw fail(400, ErrorCode.ValidationError);
        me.avatar = { '128': uri, '256': uri, '512': uri };
      }
      return { ...me };
    },
  };
}

export const fakeAccountRepository = createFakeAccountRepository();
