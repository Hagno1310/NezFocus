// Username and password rules of REQ-AUTH-01, shared so the app's checklist and the
// backend's 40001 field errors never disagree. Issue codes become `errors.<field>[].code`.

export const USERNAME_MIN = 2;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type UsernameIssue = 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_CHARS';

export type PasswordIssue =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'MISSING_UPPERCASE'
  | 'MISSING_LOWERCASE'
  | 'MISSING_DIGIT'
  | 'MISSING_SPECIAL'
  // Shown under the field, not in the checklist (CR-16).
  | 'SAME_AS_PERSONAL_INFO';

// DEC-03: usernames are stored lowercase.
export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

// Expects a normalized username.
export function checkUsername(username: string): UsernameIssue[] {
  const issues: UsernameIssue[] = [];
  if (username.length < USERNAME_MIN) issues.push('TOO_SHORT');
  if (username.length > USERNAME_MAX) issues.push('TOO_LONG');
  if (!/^[a-z0-9_.]*$/.test(username)) issues.push('INVALID_CHARS');
  return issues;
}

const fold = (s: string) => s.normalize('NFC').toLowerCase();

// Accented Vietnamese letters are letters; "special" is anything that is not a letter or digit.
export function checkPassword(
  password: string,
  personal: { username?: string | null; email?: string | null } = {},
): PasswordIssue[] {
  // NFC first: a decomposed "ệ" would otherwise count its accent as a special character.
  const pw = password.normalize('NFC');
  const issues: PasswordIssue[] = [];
  const length = [...pw].length;
  if (length < PASSWORD_MIN) issues.push('TOO_SHORT');
  if (length > PASSWORD_MAX) issues.push('TOO_LONG');
  if (!/\p{Lu}/u.test(pw)) issues.push('MISSING_UPPERCASE');
  if (!/\p{Ll}/u.test(pw)) issues.push('MISSING_LOWERCASE');
  if (!/\p{Nd}/u.test(pw)) issues.push('MISSING_DIGIT');
  if (!/[^\p{L}\p{N}]/u.test(pw)) issues.push('MISSING_SPECIAL');

  // CR-28 #9: "is", not "contains", and case does not matter.
  const email = personal.email ? fold(personal.email) : null;
  const forbidden = [
    personal.username ? fold(personal.username) : null,
    email,
    email ? email.split('@')[0] : null,
  ];
  if (forbidden.includes(fold(password))) issues.push('SAME_AS_PERSONAL_INFO');
  return issues;
}

// Prefill for the Complete account screen: the part before @, reduced to allowed characters.
export function suggestUsername(email: string): string | null {
  const local = email.split('@')[0] ?? '';
  const candidate = local
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, USERNAME_MAX);
  return candidate.length >= USERNAME_MIN ? candidate : null;
}
