import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import {
  KickMemberRequest,
  MemberListQuery,
  MemberRoutes,
  SnowflakeId,
  UpdateMemberRequest,
  type MemberListResponse,
  type ServerMember,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { MembersService } from './members.service.js';
import { ModerationService } from './moderation.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

// SRS 5.3 Member (REQ-ROLE-04, CR-28 #23; REQ-ROLE-05 timeout and kick).
@Controller()
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly moderation: ModerationService,
  ) {}

  @Patch(MemberRoutes.member)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
    @Body(new ZodValidationPipe(UpdateMemberRequest)) body: UpdateMemberRequest,
  ): Promise<ServerMember> {
    return this.moderation.timeout(user.userId, BigInt(id), BigInt(userId), {
      timeout_until: body.timeout_until,
      reason: body.reason,
    });
  }

  @Delete(MemberRoutes.member)
  @HttpCode(204)
  kick(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
    // Express 5 leaves req.body undefined for a DELETE without one.
    @Body(new ZodValidationPipe(KickMemberRequest.default({})))
    body: KickMemberRequest,
  ): Promise<void> {
    return this.moderation.kick(
      user.userId,
      BigInt(id),
      BigInt(userId),
      body.reason ?? null,
    );
  }

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
