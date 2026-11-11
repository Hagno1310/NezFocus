import { ErrorCode, type SessionInfo } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { AccountRepository } from './AccountRepository';
import {
  changePassword,
  changePasswordErrors,
  type ChangePasswordForm,
} from './changePassword';
import { deviceLabel, lastActive, splitSessions } from './sessions';

const NOW = Date.parse('2026-10-18T13:12:00Z'); // 20:12 in Hồ Chí Minh (spec 07)
const ZONE = 'Asia/Ho_Chi_Minh';
const me = { email: 'an.nguyen@gmail.com', username: 'an.nguyen' };
const apiError = (code: number, extra = {}) =>
  Object.assign(new Error('x'), { code, ...extra });
const noCall = () => Promise.reject(new Error('no call'));
const repo = (over: Partial<AccountRepository>): AccountRepository => ({
  me: noCall,
  changePassword: async () => {},
  sessions: noCall,
  revokeSession: noCall,
  revokeOtherSessions: noCall,
  updateProfile: noCall,
  ...over,
});
const byPassword: ChangePasswordForm = {
  mode: 'password',
  current: 'NezFocus@2026',
  password: 'Ontap@2026',
};
const byCode: ChangePasswordForm = {
  mode: 'code',
  code: '482913',
  password: 'Ontap@2026',
};

describe('changePasswordErrors (S-ME-03 password-form / password-code)', () => {
  it('a filled form passes in both modes', () => {
    expect(changePasswordErrors(byPassword, me)).toEqual({});
    expect(changePasswordErrors(byCode, me)).toEqual({});
  });

  it('an empty current password or a short code is reported with the rules', () => {
    expect(
      changePasswordErrors(
        { ...byPassword, current: '', password: 'ontap' },
        me,
      ),
    ).toEqual({ current: 'empty', password: 'rules' });
    expect(changePasswordErrors({ ...byCode, code: '48' }, me)).toEqual({
      code: 'incomplete',
    });
  });

  it('AUTH-14 AC4 / CR-16 #6: the username is caught on the phone too', () => {
    const user = { email: 'an@x.co', username: 'an.nguyen9' };
    expect(
      changePasswordErrors({ ...byPassword, password: 'an.nguyen9' }, user),
    ).toEqual({ password: 'rules' });
    expect(
      changePasswordErrors({ ...byPassword, password: 'An.Nguyen9' }, user),
    ).toEqual({ password: 'same-username' });
  });
});

describe('changePassword (AUTH-14)', () => {
  const failing = (err: unknown, form: ChangePasswordForm = byPassword) =>
    changePassword(
      repo({ changePassword: () => Promise.reject(err) }),
      form,
      me,
      () => NOW,
    );

  it('sends current_password or code, never both', async () => {
    const sent: unknown[] = [];
    const r = repo({ changePassword: async (b) => void sent.push(b) });
    await changePassword(r, byPassword, me, () => NOW);
    await changePassword(r, byCode, me, () => NOW);
    expect(sent).toEqual([
      { current_password: 'NezFocus@2026', new_password: 'Ontap@2026' },
      { code: '482913', new_password: 'Ontap@2026' },
    ]);
  });

  it('AC2: 40102 is current-wrong; AC3: 40029 waits from Retry-After', async () => {
    await expect(
      failing(apiError(ErrorCode.InvalidCredentials)),
    ).resolves.toEqual({ ok: false, error: { kind: 'current-wrong' } });
    await expect(
      failing(apiError(ErrorCode.RateLimited, { retry_after: 600 })),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'rate-limited', until: NOW + 600_000 },
    });
  });

  it('AC5: code errors as on S-AUTH-03', async () => {
    await expect(
      failing(
        apiError(ErrorCode.VerificationCodeInvalid, { attempts_left: 4 }),
        byCode,
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'code-wrong', attemptsLeft: 4 },
    });
    await expect(
      failing(apiError(ErrorCode.TokenLinkInvalid), byCode),
    ).resolves.toEqual({ ok: false, error: { kind: 'code-expired' } });
  });

  it('AC4: 40001 on new_password maps to the field', async () => {
    await expect(
      failing(
        apiError(ErrorCode.ValidationError, {
          errors: { new_password: [{ code: 'SAME_AS_PERSONAL_INFO' }] },
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: { kind: 'password', error: 'same-username' },
    });
  });
});

const session = (over: Partial<SessionInfo>): SessionInfo => ({
  id: '1',
  device_name: 'Samsung Galaxy A54',
  platform: 'android',
  ip_prefix: null,
  created_at: '2026-10-01T00:00:00Z',
  last_active_at: '2026-10-18T13:00:00Z',
  current: false,
  ...over,
});

describe('sessions (S-ME-03 sessions)', () => {
  it('this device apart from the others, which keep their order', () => {
    const a = session({ id: 'a' });
    const here = session({ id: 'here', current: true });
    const b = session({ id: 'b' });
    expect(splitSessions([a, here, b])).toEqual({
      current: here,
      others: [a, b],
    });
  });

  it('last active like message times: today, yesterday, then the full date', () => {
    expect(lastActive('2026-10-18T13:01:00Z', NOW, ZONE)).toEqual({
      kind: 'today',
      time: '20:01',
    });
    expect(lastActive('2026-10-17T15:15:00Z', NOW, ZONE)).toEqual({
      kind: 'yesterday',
      time: '22:15',
    });
    expect(lastActive('2026-10-15T16:59:00Z', NOW, ZONE)).toEqual({
      kind: 'date',
      date: '15/10/2026',
      time: '23:59',
    });
  });

  it('the device name: maker + model, the maker once', () => {
    expect(deviceLabel('samsung', 'SM-A546E')).toBe('Samsung SM-A546E');
    expect(deviceLabel('Xiaomi', 'Xiaomi Redmi Note 12')).toBe(
      'Xiaomi Redmi Note 12',
    );
    expect(deviceLabel('realme', '')).toBeUndefined();
  });
});
