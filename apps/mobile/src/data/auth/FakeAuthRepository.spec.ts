import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  createFakeAuthRepository,
  FAKE_CODE,
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
});
