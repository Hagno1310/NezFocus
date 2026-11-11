import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { FAKE_CODE, FAKE_PASSWORD } from '../auth/FakeAuthRepository';
import { createFakeAccountRepository } from './FakeAccountRepository';

describe('FakeAccountRepository', () => {
  it('AUTH-14: a wrong current password is 40102, the fifth in a row 40029', async () => {
    const repo = createFakeAccountRepository(0);
    const body = { current_password: 'x', new_password: 'Ontap@2026' };
    for (let i = 0; i < 4; i++)
      await expect(repo.changePassword(body)).rejects.toMatchObject({
        code: ErrorCode.InvalidCredentials,
      });
    await expect(repo.changePassword(body)).rejects.toMatchObject({
      code: ErrorCode.RateLimited,
      retry_after: 600,
    });
  });

  it('AC1 / AC5: by password or by code, the other sessions end', async () => {
    const repo = createFakeAccountRepository(0);
    expect(await repo.sessions()).toHaveLength(2);
    await repo.changePassword({
      current_password: FAKE_PASSWORD,
      new_password: 'Ontap@2026',
    });
    expect(await repo.sessions()).toEqual([
      expect.objectContaining({ current: true }),
    ]);
    await expect(
      repo.changePassword({ code: '482931', new_password: 'Ontap@2027' }),
    ).rejects.toMatchObject({
      code: ErrorCode.VerificationCodeInvalid,
      attempts_left: 4,
    });
    await expect(
      repo.changePassword({ code: FAKE_CODE, new_password: 'Ontap@2027' }),
    ).resolves.toBeUndefined();
  });

  it('AUTH-07: revoking a session twice is 40401 the second time', async () => {
    const repo = createFakeAccountRepository(0);
    await repo.revokeSession('101');
    await expect(repo.revokeSession('101')).rejects.toMatchObject({
      code: ErrorCode.NotFound,
    });
  });
});
