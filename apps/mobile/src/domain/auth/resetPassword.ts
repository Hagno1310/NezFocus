import { ErrorCode, type SessionResponse } from '@nezfocus/shared';
import type { AuthRepository } from './AuthRepository';
import { asApiError, codeErrorState, type CodeErrorState } from './authFlow';
import {
  passwordError,
  serverPasswordError,
  type PasswordError,
} from './completeAccount';

// Spec 01 › Dữ liệu nhất quán: mã OTP 6 số (the CodeInput takes digits only).
const CODE_LENGTH = 6;

// S-AUTH-05 reset-form: the code and the new password on one screen (AUTH-08, CR-16).
export type ResetForm = { email: string; code: string; password: string };

export type ResetFormErrors = {
  code?: 'incomplete';
  password?: PasswordError;
};

// Checked on "Đặt mật khẩu" before anything is sent. Only the email is known here, so a
// password that is the username is caught by the backend (resetPassword below).
export function resetFormErrors(form: ResetForm): ResetFormErrors {
  const errors: ResetFormErrors = {};
  if (form.code.length < CODE_LENGTH) errors.code = 'incomplete';
  const password = passwordError(form.password, { email: form.email });
  if (password) errors.password = password;
  return errors;
}

export type ResetErrorState =
  CodeErrorState | { kind: 'password'; error: PasswordError };

export async function resetPassword(
  repo: AuthRepository,
  form: ResetForm,
): Promise<
  { ok: true; session: SessionResponse } | { ok: false; error: ResetErrorState }
> {
  try {
    return {
      ok: true,
      session: await repo.resetPassword(form.email, form.code, form.password),
    };
  } catch (err) {
    const api = asApiError(err);
    const issues = api?.errors?.password;
    if (api?.code === ErrorCode.ValidationError && issues)
      return {
        ok: false,
        error: {
          kind: 'password',
          error: serverPasswordError(issues, form.password, form.email),
        },
      };
    return { ok: false, error: codeErrorState(err) };
  }
}
