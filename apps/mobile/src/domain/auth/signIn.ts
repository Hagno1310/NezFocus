import {
  checkUsername,
  ErrorCode,
  normalizeUsername,
  type CompleteAccountRequest,
  type CurrentUser,
  type EmailSignInResponse,
  type SessionResponse,
} from '@nezfocus/shared';
import type { AuthRepository } from './AuthRepository';
import {
  asApiError,
  canReuseCode,
  codeErrorState,
  loginErrorState,
  sendCodeErrorState,
  type CodeErrorState,
  type LoginErrorState,
  type SendCodeErrorState,
  type SentCode,
} from './authFlow';
import { serverErrors, type CompleteAccountErrors } from './completeAccount';

// Spec 01 use cases: call the repository, turn errors into screen states. Screens reach them
// through features/auth/hooks (TanStack Query mutations).

export type SendCodeResult =
  { ok: true; reused: boolean } | { ok: false; error: SendCodeErrorState };

// S-AUTH-02 › Tương tác: the same email again before the minute is up reuses the code.
// `sent` is the code this phone now waits on (unchanged when nothing new was sent).
export async function requestCode(
  repo: AuthRepository,
  last: SentCode | null,
  email: string,
  now: () => number,
  { force = false } = {},
): Promise<{ result: SendCodeResult; sent: SentCode | null }> {
  if (!force && canReuseCode(last, email, now()))
    return { result: { ok: true, reused: true }, sent: last };
  try {
    const { resend_in } = await repo.sendEmailCode(email);
    return {
      result: { ok: true, reused: false },
      sent: { email, resendAt: now() + resend_in * 1000 },
    };
  } catch (err) {
    const error = sendCodeErrorState(err);
    return {
      result: { ok: false, error },
      sent:
        error.kind === 'wait'
          ? { email, resendAt: now() + error.seconds * 1000 }
          : last,
    };
  }
}

export async function verifyCode(
  repo: AuthRepository,
  email: string,
  code: string,
): Promise<
  | { ok: true; session: EmailSignInResponse }
  | { ok: false; error: CodeErrorState }
> {
  try {
    return { ok: true, session: await repo.verifyEmailCode(email, code) };
  } catch (err) {
    return { ok: false, error: codeErrorState(err) };
  }
}

export async function logIn(
  repo: AuthRepository,
  email: string,
  password: string,
  now: () => number,
): Promise<
  { ok: true; session: SessionResponse } | { ok: false; error: LoginErrorState }
> {
  try {
    return { ok: true, session: await repo.login(email, password) };
  } catch (err) {
    return { ok: false, error: loginErrorState(err, now()) };
  }
}

// `user: null` = already completed elsewhere (40901 without a username error): just go on.
export async function finishAccount(
  repo: AuthRepository,
  body: CompleteAccountRequest,
): Promise<
  | { ok: true; user: CurrentUser | null }
  | { ok: false; fields: CompleteAccountErrors }
  | { ok: false; error: 'network' | 'other' }
> {
  try {
    return { ok: true, user: await repo.completeAccount(body) };
  } catch (err) {
    const fields = serverErrors(err);
    if (fields) return { ok: false, fields };
    const api = asApiError(err);
    if (!api) return { ok: false, error: 'network' };
    if (api.code === ErrorCode.Conflict) return { ok: true, user: null };
    return { ok: false, error: 'other' };
  }
}

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

// Usernames that break DEC-03 are not asked about: the form reports them on submit.
export async function usernameStatus(
  repo: AuthRepository,
  raw: string,
): Promise<UsernameStatus> {
  const username = normalizeUsername(raw);
  if (checkUsername(username).length) return 'idle';
  return (await repo.usernameAvailable(username)) ? 'available' : 'taken';
}
