import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ChannelRoutes,
  CreateChannelRequest,
  SnowflakeId,
  UpdateChannelPositionsRequest,
  UpdateChannelRequest,
  type ChannelResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ChannelsService } from './channels.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

// SRS 5.3 Server › channels (REQ-SRV-02).
@Controller()
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

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
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(UpdateChannelRequest))
    body: UpdateChannelRequest,
  ): Promise<ChannelResponse> {
    return this.channels.rename(user.userId, BigInt(id), body);
  }

  @Delete(ChannelRoutes.byId)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
  ): Promise<void> {
    return this.channels.remove(user.userId, BigInt(id));
  }
}
