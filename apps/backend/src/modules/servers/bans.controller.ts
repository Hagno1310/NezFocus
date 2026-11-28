import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  BanListQuery,
  BanRequest,
  BanRoutes,
  SnowflakeId,
  type BanListResponse,
} from '@nezfocus/shared';
import type { z } from 'zod';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ModerationService } from './moderation.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

// SRS 5.3 Ban (REQ-ROLE-05, REQ-ROLE-07).
@Controller()
export class BansController {
  constructor(private readonly moderation: ModerationService) {}

  @Get(BanRoutes.list)
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Query(new ZodValidationPipe(BanListQuery)) query: BanListQuery,
  ): Promise<BanListResponse> {
    return this.moderation.listBans(user.userId, BigInt(id), query);
  }

  @Put(BanRoutes.one)
  @HttpCode(204)
  ban(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
    @Body(new ZodValidationPipe(BanRequest.default({ delete_message_days: 0 })))
    body: z.output<typeof BanRequest>,
  ): Promise<void> {
    return this.moderation.ban(user.userId, BigInt(id), BigInt(userId), {
      reason: body.reason ?? null,
      delete_message_days: body.delete_message_days,
    });
  }

  @Delete(BanRoutes.one)
  @HttpCode(204)
  unban(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('userId', idParam) userId: string,
  ): Promise<void> {
    return this.moderation.unban(user.userId, BigInt(id), BigInt(userId));
  }
}
