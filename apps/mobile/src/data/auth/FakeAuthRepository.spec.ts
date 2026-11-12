import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  createFakeAuthRepository,
  FAKE_CODE,
  FAKE_EXPIRED_CODE,
  FAKE_PASSWORD,
} from './FakeAuthRepository';

describe('FakeAuthRepository', () => {
  it('An signs in with the sample password; a wrong one is 40102', async () => {
    const repo = createFakeAuthRepository(0);
    await expect(
      repo.login('an.nguyen@gmail.com', FAKE_PASSWORD),
    ).resolves.toMatchObject({
      user: { username: 'an.nguyen', account_completed: true },
    });
    await expect(repo.login('an.nguyen@gmail.com', 'x')).rejects.toMatchObject({
      code: ErrorCode.InvalidCredentials,
    });
  });

  it('a wrong code counts attempts down; a new email gets an incomplete account', async () => {
    const repo = createFakeAuthRepository(0);
    await repo.sendEmailCode('binh@gmail.com');
    await expect(
      repo.verifyEmailCode('binh@gmail.com', '000000'),
    ).rejects.toMatchObject({
      code: ErrorCode.VerificationCodeInvalid,
      attempts_left: 4,
    });
    await expect(
      repo.verifyEmailCode('binh@gmail.com', FAKE_CODE),
    ).resolves.toMatchObject({
      user: { account_completed: false },
      suggested_username: 'binh',
    });
  });

  it('the fifth wrong code is 0 tries left, then the code is gone (40002)', async () => {
    const repo = createFakeAuthRepository(0);
    await repo.sendEmailCode('binh@gmail.com');
    for (let left = 4; left >= 0; left--)
      await expect(
        repo.verifyEmailCode('binh@gmail.com', '000000'),
      ).rejects.toMatchObject({ attempts_left: left });
    await expect(
      repo.verifyEmailCode('binh@gmail.com', FAKE_CODE),
    ).rejects.toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('a sample expired code is 40002', async () => {
    const repo = createFakeAuthRepository(0);
    await repo.sendEmailCode('binh@gmail.com');
    await expect(
      repo.verifyEmailCode('binh@gmail.com', FAKE_EXPIRED_CODE),
    ).rejects.toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('AUTH-13: once a minute, ten a day per email (40029 with retry_after)', async () => {
    let now = 0;
    const repo = createFakeAuthRepository(0, () => now);
    await repo.sendEmailCode('binh@gmail.com');
    await expect(repo.sendEmailCode('binh@gmail.com')).rejects.toMatchObject({
      code: ErrorCode.RateLimited,
      retry_after: 60,
    });
    for (let i = 1; i < 10; i++) {
      now += 60_000;
      await repo.sendEmailCode('binh@gmail.com');
    }
    now += 60_000;
    await expect(repo.sendEmailCode('binh@gmail.com')).rejects.toMatchObject({
      code: ErrorCode.RateLimited,
    });
    await expect(repo.sendEmailCode('chi@gmail.com')).resolves.toBeTruthy();
  });

  it('AUTH-02 AC3: the sixth try after five wrong passwords is 40029 for 10 minutes', async () => {
    let now = 0;
    const repo = createFakeAuthRepository(0, () => now);
    for (let i = 0; i < 5; i++)
      await expect(
        repo.login('an.nguyen@gmail.com', 'x'),
      ).rejects.toMatchObject({ code: ErrorCode.InvalidCredentials });
    await expect(
      repo.login('an.nguyen@gmail.com', FAKE_PASSWORD),
    ).rejects.toMatchObject({ code: ErrorCode.RateLimited, retry_after: 600 });
    now += 600_000;
    await expect(
      repo.login('an.nguyen@gmail.com', FAKE_PASSWORD),
    ).resolves.toBeTruthy();
  });

  it('a username taken while the form was open is 40901 on username', async () => {
    const repo = createFakeAuthRepository(0);
    await repo.verifyEmailCode('binh@gmail.com', FAKE_CODE);
    await expect(repo.usernameAvailable('an')).resolves.toBe(false);
    await expect(
      repo.completeAccount({
        display_name: 'Bình',
        username: 'an',
        password: 'Ontap@2026',
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        age_confirmed: true,
        terms_accepted: true,
        terms_version: '2026-11-05',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.Conflict,
      errors: { username: [{ code: 'TAKEN' }] },
    });
  });

  it('AUTH-08 AC5: a reset code once a minute, three an hour, for any email', async () => {
    let now = 0;
    const repo = createFakeAuthRepository(0, () => now);
    await repo.forgotPassword('khong.co@gmail.com');
    await expect(
      repo.forgotPassword('khong.co@gmail.com'),
    ).rejects.toMatchObject({ code: ErrorCode.RateLimited, retry_after: 60 });
    now += 60_000;
    await repo.forgotPassword('khong.co@gmail.com');
    now += 60_000;
    await repo.forgotPassword('khong.co@gmail.com');
    now += 60_000;
    await expect(
      repo.forgotPassword('khong.co@gmail.com'),
    ).rejects.toMatchObject({
      code: ErrorCode.RateLimited,
      retry_after: 3_420,
    });
  });

  it('AUTH-08 AC3, AC4, AC6: wrong code, rules, then the new password signs An in', async () => {
    const repo = createFakeAuthRepository(0);
    const email = 'an.nguyen@gmail.com';
    await repo.forgotPassword(email);
    await expect(
      repo.resetPassword(email, '482931', 'Ontap@2026'),
    ).rejects.toMatchObject({
      code: ErrorCode.VerificationCodeInvalid,
      attempts_left: 4,
    });
    await expect(
      repo.resetPassword(email, FAKE_CODE, 'ontap2026'),
    ).rejects.toMatchObject({
      code: ErrorCode.ValidationError,
      errors: { password: expect.any(Array) },
    });
    await expect(
      repo.resetPassword(email, FAKE_CODE, 'Ontap@2026'),
    ).resolves.toMatchObject({ user: { username: 'an.nguyen' } });
    await expect(repo.login(email, 'Ontap@2026')).resolves.toBeTruthy();
    await expect(
      repo.resetPassword(email, FAKE_CODE, 'Ontap@2027'),
    ).rejects.toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('an email without an account never gets past the code (40002)', async () => {
    const repo = createFakeAuthRepository(0);
    await repo.forgotPassword('khong.co@gmail.com');
    await expect(
      repo.resetPassword('khong.co@gmail.com', FAKE_CODE, 'Ontap@2026'),
    ).rejects.toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });
});
