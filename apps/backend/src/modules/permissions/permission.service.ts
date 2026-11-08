import { Injectable } from '@nestjs/common';
import { ErrorCode } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';

export type PermissionScope = { serverId: bigint } | { channelId: bigint };

// REQ-ROLE-08: every endpoint and Gateway event checks permissions here, and only here.
// Owner: permissions (A). Inject the abstract class; never the stand-in.
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

// ponytail: allows everything until roles exist; P1-A3.2 (#65, P1-A3 #8) swaps in the DB-backed one.
@Injectable()
export class AllowAllPermissionService extends PermissionService {
  async can(_userId: bigint, _scope: PermissionScope, _permission: bigint) {
    return true;
  }
}
