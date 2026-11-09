import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ChannelRoutes,
  CreateChannelRequest,
  PutChannelPermissionRequest,
  SnowflakeId,
  UpdateChannelPositionsRequest,
  UpdateChannelRequest,
  type ChannelResponse,
  type PermissionOverwrite,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ChannelOverwritesService } from './channel-overwrites.service.js';
import { ChannelsService } from './channels.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

// SRS 5.3 Server › channels (REQ-SRV-02) and their overwrites (REQ-ROLE-03).
@Controller()
export class ChannelsController {
  constructor(
    private readonly channels: ChannelsService,
    private readonly overwrites: ChannelOverwritesService,
  ) {}

  @Get(ChannelRoutes.list)
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
  ): Promise<ChannelResponse[]> {
    return this.channels.list(user.userId, BigInt(id));
  }

  @Post(ChannelRoutes.list)
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(CreateChannelRequest))
    body: CreateChannelRequest,
  ): Promise<ChannelResponse> {
    return this.channels.create(user.userId, BigInt(id), body);
  }

  @Patch(ChannelRoutes.positions)
  @HttpCode(204)
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(UpdateChannelPositionsRequest))
    body: UpdateChannelPositionsRequest,
  ): Promise<void> {
    return this.channels.reorder(user.userId, BigInt(id), body);
  }

  @Patch(ChannelRoutes.byId)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(UpdateChannelRequest))
    body: UpdateChannelRequest,
  ): Promise<ChannelResponse> {
    return this.channels.update(user.userId, BigInt(id), body);
  }

  @Delete(ChannelRoutes.byId)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
  ): Promise<void> {
    return this.channels.remove(user.userId, BigInt(id));
  }

  @Put(ChannelRoutes.permission)
  putPermission(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('targetId', idParam) targetId: string,
    @Body(new ZodValidationPipe(PutChannelPermissionRequest))
    body: PutChannelPermissionRequest,
  ): Promise<PermissionOverwrite> {
    return this.overwrites.put(user.userId, BigInt(id), BigInt(targetId), body);
  }

  @Delete(ChannelRoutes.permission)
  @HttpCode(204)
  deletePermission(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('targetId', idParam) targetId: string,
  ): Promise<void> {
    return this.overwrites.remove(user.userId, BigInt(id), BigInt(targetId));
  }
}
