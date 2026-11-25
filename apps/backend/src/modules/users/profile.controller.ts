import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  AccountRoutes,
  ProfileRoutes,
  SnowflakeId,
  UpdateProfileRequest,
  type CurrentUser as CurrentUserJson,
  type UserProfile,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ProfileService } from './profile.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

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

  @Get(ProfileRoutes.byUser)
  of(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
  ): Promise<UserProfile> {
    return this.profile.of(user.userId, BigInt(id));
  }
}
