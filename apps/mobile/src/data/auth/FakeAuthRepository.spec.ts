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
    const repo = createFakeAuthRepository(0, () => 0);
    for (let i = 0; i < 5; i++)
      await expect(
        repo.login('an.nguyen@gmail.com', 'x'),
      ).rejects.toMatchObject({ code: ErrorCode.InvalidCredentials });
    await expect(
      repo.login('an.nguyen@gmail.com', FAKE_PASSWORD),
    ).rejects.toMatchObject({ code: ErrorCode.RateLimited, retry_after: 600 });
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
});
