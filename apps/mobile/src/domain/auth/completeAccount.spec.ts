import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  completeAccountErrors,
  firstError,
  serverErrors,
  type CompleteAccountForm,
} from './completeAccount';

const email = 'an.nguyen@gmail.com';
const filled: CompleteAccountForm = {
  displayName: 'An',
  username: 'an.nguyen',
  password: 'Ontap@2026',
  ageConfirmed: true,
  termsAccepted: true,
};

describe('completeAccountErrors (S-ONB-01, REQ-AUTH-01)', () => {
  it('a filled form has no errors', () => {
    expect(completeAccountErrors(filled, email)).toEqual({});
  });

  it('field-error: empty name, weak password, nothing ticked; the name is the first error', () => {
    const errors = completeAccountErrors(
      {
        ...filled,
        displayName: '  ',
        password: 'ontap2026',
        ageConfirmed: false,
        termsAccepted: false,
      },
      email,
    );
    expect(errors).toEqual({
      displayName: 'empty',
      password: 'rules',
      age: 'required',
      terms: 'required',
    });
    expect(firstError(errors)).toBe('displayName');
  });

  it('AUTH-06: a display name over 32 characters is too long', () => {
    expect(
      completeAccountErrors({ ...filled, displayName: 'x'.repeat(33) }, email)
        .displayName,
    ).toBe('too-long');
  });

  it('DEC-03: characters outside a-z 0-9 _ . and lengths under 2 are username errors', () => {
    expect(
      completeAccountErrors({ ...filled, username: 'nez focus!' }, email)
        .username,
    ).toBe('invalid-chars');
    expect(
      completeAccountErrors({ ...filled, username: 'a' }, email).username,
    ).toBe('length');
  });

  it('AC6 / CR-28 #9: the password may not be the email, its local part or the username', () => {
    const pw = (password: string, username = filled.username) =>
      completeAccountErrors({ ...filled, password, username }, email).password;
    expect(pw('AN.NGUYEN@gmail.com')).toBe('rules'); // no digit either
    expect(pw('An.nguyen@gmail.com1')).toBeUndefined();
    expect(pw('Ontap_2026', 'ontap_2026')).toBe('same-username');
    expect(pw('An.nguyen2026!')).toBeUndefined(); // contains is fine
  });
});

describe('serverErrors', () => {
  it('AC2: 40901 on username is username-taken-on-submit', () => {
    expect(
      serverErrors({
        code: ErrorCode.Conflict,
        errors: { username: [{ code: 'TAKEN', message: 'x' }] },
      }),
    ).toEqual({ username: 'taken-on-submit' });
  });

  it('40001 field errors map onto the same fields', () => {
    expect(
      serverErrors({
        code: ErrorCode.ValidationError,
        errors: {
          password: [{ code: 'SAME_AS_PERSONAL_INFO', message: 'x' }],
          display_name: [{ code: 'too_small', message: 'x' }],
          terms_accepted: [{ code: 'invalid_value', message: 'x' }],
        },
      }),
    ).toEqual({
      password: 'same-email',
      displayName: 'empty',
      terms: 'required',
    });
  });

  it('anything else is not a field error', () => {
    expect(serverErrors({ code: ErrorCode.InternalError })).toBeNull();
    expect(serverErrors(new TypeError('Network request failed'))).toBeNull();
  });
});
