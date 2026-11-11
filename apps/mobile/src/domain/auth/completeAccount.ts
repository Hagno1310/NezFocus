import { asApiError } from './authFlow';
import {
  DISPLAY_NAME_MAX,
  checkPassword,
  checkUsername,
  ErrorCode,
  normalizeUsername,
} from '@nezfocus/shared';

// S-ONB-01 form rules. Same shared checks as the backend, so a form that passes here only
// fails there for a username taken in the meantime (40901).
export type CompleteAccountForm = {
  displayName: string;
  username: string;
  password: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
};

export type CompleteAccountErrors = {
  displayName?: 'empty' | 'too-long';
  username?: 'length' | 'invalid-chars' | 'taken' | 'taken-on-submit';
  password?: PasswordError;
  age?: 'required';
  terms?: 'required';
};

export type CompleteAccountField = keyof CompleteAccountErrors;

// Top-to-bottom order on screen: the form scrolls to the first one with an error.
const ORDER: CompleteAccountField[] = [
  'displayName',
  'username',
  'password',
  'age',
  'terms',
];

const fold = (s: string) => s.normalize('NFC').toLowerCase();

export type PasswordError = 'rules' | 'same-email' | 'same-username';

// AUTH-01 AC6 / CR-28 #9, for every form that sets a password (S-ONB-01, S-AUTH-05, S-ME-03).
// The rules come first: a password that breaks one is not also blamed on the email.
export function passwordError(
  password: string,
  personal: { email: string; username?: string | null },
): PasswordError | undefined {
  const issues = checkPassword(password, personal);
  if (issues.some((i) => i !== 'SAME_AS_PERSONAL_INFO')) return 'rules';
  if (!issues.length) return undefined;
  return personal.username && fold(password) === fold(personal.username)
    ? 'same-username'
    : 'same-email';
}

// 40001 on a password field. The backend does not say which personal detail matched: the
// phone knows the email, so a match it did not flag is the username.
export function serverPasswordError(
  issues: { code: string }[],
  password: string,
  email: string,
): PasswordError {
  if (!issues.some((e) => e.code === 'SAME_AS_PERSONAL_INFO')) return 'rules';
  return passwordError(password, { email }) === 'same-email'
    ? 'same-email'
    : 'same-username';
}

export function completeAccountErrors(
  form: CompleteAccountForm,
  email: string,
): CompleteAccountErrors {
  const errors: CompleteAccountErrors = {};
  const name = form.displayName.trim();
  if (!name) errors.displayName = 'empty';
  else if (name.length > DISPLAY_NAME_MAX) errors.displayName = 'too-long';

  const username = normalizeUsername(form.username);
  const usernameIssues = checkUsername(username);
  if (usernameIssues.includes('INVALID_CHARS'))
    errors.username = 'invalid-chars';
  else if (usernameIssues.length) errors.username = 'length';

  const password = passwordError(form.password, { username, email });
  if (password) errors.password = password;

  if (!form.ageConfirmed) errors.age = 'required';
  if (!form.termsAccepted) errors.terms = 'required';
  return errors;
}

export const firstError = (errors: CompleteAccountErrors) =>
  ORDER.find((f) => errors[f]);

// 40901 / 40001 from POST /auth/complete-account as field errors; null = not about a field.
export function serverErrors(err: unknown): CompleteAccountErrors | null {
  const api = asApiError(err);
  if (!api) return null;
  const { code, errors = {} } = api;
  if (code === ErrorCode.Conflict)
    return errors.username ? { username: 'taken-on-submit' } : null;
  if (code !== ErrorCode.ValidationError) return null;
  const out: CompleteAccountErrors = {};
  if (errors.display_name) out.displayName = 'empty';
  if (errors.username) out.username = 'invalid-chars';
  if (errors.password)
    out.password = errors.password.some(
      (e) => e.code === 'SAME_AS_PERSONAL_INFO',
    )
      ? 'same-email'
      : 'rules';
  if (errors.age_confirmed) out.age = 'required';
  if (errors.terms_accepted) out.terms = 'required';
  return firstError(out) ? out : null;
}
