import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import {
  CLIENT_PLATFORM_HEADER,
  ClientPlatform,
  ErrorCode,
} from '@nezfocus/shared';
import type { Request } from 'express';
import { AppError } from '../../common/app-error.js';
import type { ClientInfo } from './session.service.js';

export const IS_PUBLIC = 'auth:public';
export const ALLOW_INCOMPLETE = 'auth:allow-incomplete';

// No bearer token needed (SRS 5.2 lists the public endpoints).
export const Public = () => SetMetadata(IS_PUBLIC, true);

// Reachable before Complete account (SRS 11.1 40309 lists them).
export const AllowIncomplete = () => SetMetadata(ALLOW_INCOMPLETE, true);

export type AuthUser = { userId: bigint; sessionId: bigint };
export type AuthedRequest = Request & { user?: AuthUser };

// The signed-in user, set by AuthGuard. Usage: @CurrentUser() user: AuthUser
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new Error('@CurrentUser() on a @Public() route');
    return user;
  },
);

// X-Client-Platform (required) and the caller's IP, for recording a session.
export const Client = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClientInfo => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const platform = ClientPlatform.safeParse(
      req.header(CLIENT_PLATFORM_HEADER),
    );
    if (!platform.success)
      throw new AppError(ErrorCode.ValidationError, 'Invalid request', {
        [CLIENT_PLATFORM_HEADER]: [
          { code: 'INVALID_VALUE', message: 'Expected ios or android' },
        ],
      });
    return { platform: platform.data, ip: req.ip };
  },
);
