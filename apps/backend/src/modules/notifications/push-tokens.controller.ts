import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { PushTokenRoutes, RegisterPushTokenRequest } from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { PushTokensService } from './push-tokens.js';

@Controller()
export class PushTokensController {
  constructor(private readonly tokens: PushTokensService) {}

  @Put(PushTokenRoutes.register)
  @HttpCode(204)
  async register(
    @Body(new ZodValidationPipe(RegisterPushTokenRequest))
    body: RegisterPushTokenRequest,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tokens.register(
      user.userId,
      user.sessionId,
      body.token,
      body.kind,
    );
  }

  @Delete(PushTokenRoutes.remove)
  @HttpCode(204)
  async remove(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    await this.tokens.remove(user.userId, token);
  }
}
