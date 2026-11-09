import { ErrorCode, Permission } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import {
  PermissionService,
  type PermissionScope,
} from './permission.service.js';

class FixedPermissionService extends PermissionService {
  constructor(private readonly answer: boolean) {
    super();
  }
  async can() {
    return this.answer;
  }
}

const channel: PermissionScope = { channelId: 42n };

describe('PermissionService (REQ-ROLE-08)', () => {
  it('require passes when the user has the permission', async () => {
    await expect(
      new FixedPermissionService(true).require(
        1n,
        channel,
        Permission.SEND_MESSAGES,
      ),
    ).resolves.toBeUndefined();
  });

  it('require throws 40302 when the user lacks it', async () => {
    const error = await new FixedPermissionService(false)
      .require(1n, channel, Permission.SEND_MESSAGES)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(ErrorCode.Forbidden);
  });
});
