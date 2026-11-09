import { ErrorCode } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';

export type PermissionScope = { serverId: bigint } | { channelId: bigint };

// REQ-ROLE-08: every endpoint and Gateway event checks permissions here, and only here.
// Owner: permissions (A). Inject the abstract class; DbPermissionService runs it.
export abstract class PermissionService {
  // Several bits OR-ed means all of them; a channel scope applies overwrites (SRS 8.5.2).
  abstract can(
    userId: bigint,
    scope: PermissionScope,
    permission: bigint,
  ): Promise<boolean>;

  // Same check, but throws 40302 so an endpoint can stop in one line.
  async require(userId: bigint, scope: PermissionScope, permission: bigint) {
    if (!(await this.can(userId, scope, permission))) {
      throw new AppError(ErrorCode.Forbidden, 'missing permission');
    }
  }
}
