import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import {
  ALLOW_INCOMPLETE,
  IS_PUBLIC,
  type AuthedRequest,
} from './auth.decorators.js';
import { SessionRepository } from './session.repository.js';
import { sessionEnded } from './session.service.js';
import { TokenService } from './token.service.js';

// Global: every route needs a bearer token unless marked @Public().
// One query per request also catches revoked sessions before the access token expires.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionRepository,
  ) {}

  private flag(key: string, ctx: ExecutionContext) {
    return this.reflector.getAllAndOverride<boolean>(key, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.flag(IS_PUBLIC, ctx)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token)
      throw new AppError(ErrorCode.TokenInvalid, 'Missing access token');

    const claims = await this.tokens.verifyAccess(token);
    const state = await this.sessions.findAuthState(claims.sessionId);
    if (!state || state.userId !== claims.userId)
      throw new AppError(ErrorCode.TokenInvalid, 'Unknown session');
    if (state.revokedAt) throw sessionEnded(state.revokeReason);
    if (!state.accountCompletedAt && !this.flag(ALLOW_INCOMPLETE, ctx))
      throw new AppError(
        ErrorCode.AccountIncomplete,
        'Complete your account first',
      );

    req.user = claims;
    return true;
  }
}
