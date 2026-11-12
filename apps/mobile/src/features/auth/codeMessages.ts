import type { TFunction } from 'i18next';
import type { CodeErrorState } from '../../domain/auth/authFlow';
import type { PasswordError } from '../../domain/auth/completeAccount';

// Spec 01 S-AUTH-03 code errors, shared by every screen that takes a code with a new
// password (S-AUTH-05 reset-form, 07 S-ME-03 password-code).
export const needsNewCode = (error: CodeErrorState | null) =>
  error?.kind === 'too-many-attempts' || error?.kind === 'code-expired';

export function codeErrorMessage(t: TFunction, error: CodeErrorState | null) {
  if (error?.kind === 'code-wrong')
    return {
      tone: 'error' as const,
      text: t('auth.enterCode.wrong', { count: error.attemptsLeft }),
    };
  if (error?.kind === 'too-many-attempts')
    return { tone: 'error' as const, text: t('auth.enterCode.tooMany') };
  if (error?.kind === 'code-expired')
    return { tone: 'error' as const, text: t('auth.enterCode.expired') };
  return null;
}

// The line under "Mật khẩu mới" (S-ONB-01 field-error wording).
export const passwordErrorKey = {
  rules: 'auth.complete.passwordRules',
  'same-email': 'auth.complete.sameEmail',
  'same-username': 'auth.complete.sameUsername',
} as const satisfies Record<PasswordError, string>;
