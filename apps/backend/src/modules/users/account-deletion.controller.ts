import { Body, Controller, Delete, Get, HttpCode } from '@nestjs/common';
import {
  AccountRoutes,
  DeleteAccountRequest,
  type AccountDeletionPreview,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { AccountDeletionService } from './account-deletion.service.js';

// SRS 5.3 Account (REQ-AUTH-10).
@Controller()
export class AccountDeletionController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @Delete(AccountRoutes.me)
  @HttpCode(204)
  request(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(DeleteAccountRequest))
    body: DeleteAccountRequest,
  ): Promise<void> {
    return this.deletion.request(user.userId, body.password);
  }

  @Get(AccountRoutes.deletion)
  preview(@CurrentUser() user: AuthUser): Promise<AccountDeletionPreview> {
    return this.deletion.preview(user.userId);
  }

  @Delete(AccountRoutes.deletion)
  @HttpCode(204)
  cancel(@CurrentUser() user: AuthUser): Promise<void> {
    return this.deletion.cancel(user.userId);
  }
}
