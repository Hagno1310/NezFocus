import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ServerRoutes,
  SnowflakeId,
  TransferOwnerRequest,
  type DeletedServersResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ServerLifecycleService } from './server-lifecycle.service.js';

// SRS 5.3 Server (REQ-SRV-05).
@Controller()
export class ServerLifecycleController {
  constructor(private readonly lifecycle: ServerLifecycleService) {}

  @Get(ServerRoutes.deleted)
  deleted(@CurrentUser() user: AuthUser): Promise<DeletedServersResponse> {
    return this.lifecycle.deleted(user.userId);
  }

  @Delete(ServerRoutes.leave)
  @HttpCode(204)
  leave(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<void> {
    return this.lifecycle.leave(user.userId, BigInt(id));
  }

  @Delete(ServerRoutes.byId)
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<void> {
    return this.lifecycle.delete(user.userId, BigInt(id));
  }

  @Post(ServerRoutes.restore)
  @HttpCode(200)
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<ServerResponse> {
    return this.lifecycle.restore(user.userId, BigInt(id));
  }

  @Post(ServerRoutes.transfer)
  @HttpCode(204)
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(TransferOwnerRequest))
    body: TransferOwnerRequest,
  ): Promise<void> {
    return this.lifecycle.transfer(user.userId, BigInt(id), body);
  }
}
