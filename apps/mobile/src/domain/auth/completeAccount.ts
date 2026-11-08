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
  password?: 'rules' | 'same-email' | 'same-username';
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

  const issues = checkPassword(form.password, { username, email });
  if (issues.some((i) => i !== 'SAME_AS_PERSONAL_INFO'))
    errors.password = 'rules';
  else if (issues.length)
    errors.password =
      fold(form.password) === fold(username) ? 'same-username' : 'same-email';

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
