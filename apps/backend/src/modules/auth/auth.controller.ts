import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  AccountRoutes,
  AuthRoutes,
  ChangePasswordRequest,
  CheckUsernameRequest,
  CompleteAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  ResetPasswordRequest,
  SendEmailCodeRequest,
  SnowflakeId,
  type SessionInfo,
  VerifyEmailCodeRequest,
  type CurrentUser as CurrentUserJson,
  type EmailCodeSentResponse,
  type EmailSignInResponse,
  type SessionResponse,
  type TokenPairResponse,
  type UsernameAvailableResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import {
  AllowIncomplete,
  Client,
  CurrentUser,
  Public,
  type AuthUser,
} from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import { EmailCodeService } from './email-code.service.js';
import { SessionService, type ClientInfo } from './session.service.js';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly codes: EmailCodeService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post(AuthRoutes.login)
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(LoginRequest)) body: LoginRequest,
    @Client() client: ClientInfo,
  ): Promise<SessionResponse> {
    return this.auth.login(body, client);
  }

  @Public()
  @Post(AuthRoutes.refresh)
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(RefreshTokenRequest))
    body: RefreshTokenRequest,
  ): Promise<TokenPairResponse> {
    return this.sessions.refresh(body.refresh_token);
  }

  @Public()
  @Post(AuthRoutes.sendEmailCode)
  @HttpCode(200)
  sendEmailCode(
    @Body(new ZodValidationPipe(SendEmailCodeRequest))
    body: SendEmailCodeRequest,
  ): Promise<EmailCodeSentResponse> {
    return this.codes.send(body.email, body.device.id);
  }

  @Public()
  @Post(AuthRoutes.verifyEmailCode)
  @HttpCode(200)
  verifyEmailCode(
    @Body(new ZodValidationPipe(VerifyEmailCodeRequest))
    body: VerifyEmailCodeRequest,
    @Client() client: ClientInfo,
  ): Promise<EmailSignInResponse> {
    return this.auth.verifyEmailCode(body, client);
  }

  @AllowIncomplete()
  @Get(AuthRoutes.usernameAvailable)
  usernameAvailable(
    @Query(new ZodValidationPipe(CheckUsernameRequest))
    query: CheckUsernameRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<UsernameAvailableResponse> {
    return this.auth.usernameAvailable(user.userId, query.username);
  }

  @AllowIncomplete()
  @Post(AuthRoutes.completeAccount)
  @HttpCode(200)
  completeAccount(
    @Body(new ZodValidationPipe(CompleteAccountRequest))
    body: CompleteAccountRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<CurrentUserJson> {
    return this.auth.completeAccount(user.userId, body);
  }

  @Public()
  @Post(AuthRoutes.forgotPassword)
  @HttpCode(202)
  forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordRequest))
    body: ForgotPasswordRequest,
  ): Promise<EmailCodeSentResponse> {
    return this.auth.forgotPassword(body.email);
  }

  @Public()
  @Post(AuthRoutes.resetPassword)
  @HttpCode(200)
  resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordRequest))
    body: ResetPasswordRequest,
    @Client() client: ClientInfo,
  ): Promise<SessionResponse> {
    return this.auth.resetPassword(body, client);
  }

  @Post(AccountRoutes.changePassword)
  @HttpCode(204)
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordRequest))
    body: ChangePasswordRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.auth.changePassword(user.userId, user.sessionId, body);
  }

  // Incomplete accounts may sign out too (they have a session to end).
  @AllowIncomplete()
  @Post(AuthRoutes.logout)
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.sessions.logout(user.sessionId);
  }

  @Get(AccountRoutes.sessions)
  listSessions(@CurrentUser() user: AuthUser): Promise<SessionInfo[]> {
    return this.sessions.list(user.userId, user.sessionId);
  }

  @Delete(AccountRoutes.sessions)
  @HttpCode(204)
  async revokeOtherSessions(@CurrentUser() user: AuthUser): Promise<void> {
    await this.sessions.revokeOthers(user.userId, user.sessionId, 'revoked');
  }

  @Delete(AccountRoutes.session)
  @HttpCode(204)
  async revokeSession(
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.sessions.revokeOne(user.userId, user.sessionId, BigInt(id));
  }
}
