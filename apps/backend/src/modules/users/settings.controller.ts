import { Body, Controller, Patch } from '@nestjs/common';
import {
  AccountRoutes,
  UpdateSettingsRequest,
  type UserSettings,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { SettingsService } from './settings.service.js';

@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Patch(AccountRoutes.settings)
  update(
    @Body(new ZodValidationPipe(UpdateSettingsRequest))
    body: UpdateSettingsRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<UserSettings> {
    return this.settings.update(user.userId, body);
  }
}
