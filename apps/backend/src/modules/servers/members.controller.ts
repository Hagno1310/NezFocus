import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  MemberListQuery,
  MemberRoutes,
  SnowflakeId,
  type MemberListResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { MembersService } from './members.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

// SRS 5.3 Member (REQ-ROLE-04; CR-28 #23).
@Controller()
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get(MemberRoutes.list)
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Query(new ZodValidationPipe(MemberListQuery)) query: MemberListQuery,
  ): Promise<MemberListResponse> {
    return this.members.list(user.userId, BigInt(id), query);
  }

  @Put(MemberRoutes.role)
  @HttpCode(204)
  give(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
    @Param('roleId', idParam) roleId: string,
  ): Promise<void> {
    return this.members.setRole(
      user.userId,
      BigInt(id),
      BigInt(userId),
      BigInt(roleId),
      true,
    );
  }

  @Delete(MemberRoutes.role)
  @HttpCode(204)
  take(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
    @Param('roleId', idParam) roleId: string,
  ): Promise<void> {
    return this.members.setRole(
      user.userId,
      BigInt(id),
      BigInt(userId),
      BigInt(roleId),
      false,
    );
  }
}
