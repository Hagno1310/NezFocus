import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CreateDmRequest, DmRoutes, type DmChannel } from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { DmService } from './dm.service.js';

@Controller()
export class DmController {
  constructor(private readonly dms: DmService) {}

  @Post(DmRoutes.create)
  @HttpCode(200)
  open(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateDmRequest)) body: CreateDmRequest,
  ): Promise<DmChannel> {
    return this.dms.open(user.userId, BigInt(body.recipient_id));
  }
}
