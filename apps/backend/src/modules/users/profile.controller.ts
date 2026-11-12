import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  AccountRoutes,
  UpdateProfileRequest,
  type CurrentUser as CurrentUserJson,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ProfileService } from './profile.service.js';

@Controller()
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get(AccountRoutes.me)
  me(@CurrentUser() user: AuthUser): Promise<CurrentUserJson> {
    return this.profile.get(user.userId);
  }

  @Patch(AccountRoutes.me)
  update(
    @Body(new ZodValidationPipe(UpdateProfileRequest))
    body: UpdateProfileRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<CurrentUserJson> {
    return this.profile.update(user.userId, body);
  }
}
