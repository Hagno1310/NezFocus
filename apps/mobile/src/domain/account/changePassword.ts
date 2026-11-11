import { ErrorCode, type ChangePasswordRequest } from '@nezfocus/shared';
import {
  asApiError,
  CODE_LENGTH,
  codeErrorState,
  type CodeErrorState,
} from '../auth/authFlow';
import {
  passwordError,
  serverPasswordError,
  type PasswordError,
} from '../auth/completeAccount';
import type { AccountRepository } from './AccountRepository';

// S-ME-03 Đổi mật khẩu: proven with the current password, or (Quên mật khẩu?) with the
// reset code of AUTH-08 (AUTH-14, CR-16 #10).
export type ChangePasswordForm =
  | { mode: 'password'; current: string; password: string }
  | { mode: 'code'; code: string; password: string };

export type ChangePasswordFormErrors = {
  current?: 'empty';
  code?: 'incomplete';
  password?: PasswordError;
};

type Personal = { email: string; username: string | null };

export function changePasswordErrors(
  form: ChangePasswordForm,
  personal: Personal,
): ChangePasswordFormErrors {
  const errors: ChangePasswordFormErrors = {};
  if (form.mode === 'password' && !form.current) errors.current = 'empty';
  if (form.mode === 'code' && form.code.length < CODE_LENGTH)
    errors.code = 'incomplete';
  const password = passwordError(form.password, personal);
  if (password) errors.password = password;
  return errors;
}

export type ChangePasswordErrorState =
  | CodeErrorState
  | { kind: 'current-wrong' }
  | { kind: 'rate-limited'; until: number } // 5 wrong in 10 minutes (AC3)
  | { kind: 'password'; error: PasswordError };

const WAIT_SECONDS = 600;

export async function changePassword(
  repo: AccountRepository,
  form: ChangePasswordForm,
  personal: Personal,
  now: () => number,
): Promise<{ ok: true } | { ok: false; error: ChangePasswordErrorState }> {
  const body: ChangePasswordRequest =
    form.mode === 'password'
      ? { current_password: form.current, new_password: form.password }
      : { code: form.code, new_password: form.password };
  try {
    await repo.changePassword(body);
    return { ok: true };
  } catch (err) {
    const api = asApiError(err);
    if (api?.code === ErrorCode.InvalidCredentials)
      return { ok: false, error: { kind: 'current-wrong' } };
    if (api?.code === ErrorCode.RateLimited)
      return {
        ok: false,
        error: {
          kind: 'rate-limited',
          until: now() + (api.retry_after ?? WAIT_SECONDS) * 1000,
        },
      };
    const issues = api?.errors?.new_password;
    if (api?.code === ErrorCode.ValidationError && issues)
      return {
        ok: false,
        error: {
          kind: 'password',
          error: serverPasswordError(issues, form.password, personal.email),
        },
      };
    return { ok: false, error: codeErrorState(err) };
  }
}
