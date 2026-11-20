import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  CreateInviteRequest,
  InviteCode,
  InviteRoutes,
  SnowflakeId,
  type InvitePreview,
  type InviteResponse,
  type ServerInviteList,
  type ServerResponse,
} from '@nezfocus/shared';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { InvitesService } from './invites.service.js';

// SRS 5.3 Invite (REQ-SRV-03, SRV-04).
@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post(InviteRoutes.create)
  async create(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(CreateInviteRequest)) body: CreateInviteRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<InviteResponse> {
    const { invite, created } = await this.invites.create(
      user.userId,
      BigInt(id),
      body,
    );
    res.status(created ? 201 : 200);
    return invite;
  }

  // S-MOD-01 `guest`: a signed-out person sees the preview too.
  @Public()
  @Get(InviteRoutes.byCode)
  preview(
    @Param('code', new ZodValidationPipe(InviteCode.catch(''))) code: string,
    @Ip() ip: string,
  ): Promise<InvitePreview> {
    return this.invites.preview(code, ip);
  }

  @Post(InviteRoutes.accept)
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthUser,
    @Param('code', new ZodValidationPipe(InviteCode.catch(''))) code: string,
    @Ip() ip: string,
  ): Promise<ServerResponse> {
    return this.invites.accept(user.userId, code, ip);
  }

  @Delete(InviteRoutes.byCode)
  @HttpCode(204)
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('code', new ZodValidationPipe(InviteCode.catch(''))) code: string,
  ): Promise<void> {
    await this.invites.revoke(user.userId, code);
  }

  @Get(InviteRoutes.forServer)
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<ServerInviteList> {
    return this.invites.listForServer(user.userId, BigInt(id));
  }
}
