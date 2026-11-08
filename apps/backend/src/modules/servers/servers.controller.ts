import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateServerRequest,
  ServerRoutes,
  SnowflakeId,
  UpdateServerRequest,
  type ServerResponse,
  type ServerSummary,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ServersService } from './servers.service.js';

// SRS 5.3 Server (REQ-SRV-01).
@Controller()
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @Post(ServerRoutes.create)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateServerRequest))
    body: CreateServerRequest,
  ): Promise<ServerResponse> {
    return this.servers.create(user.userId, body);
  }

  @Get(ServerRoutes.byId)
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<ServerResponse> {
    return this.servers.get(user.userId, BigInt(id));
  }

  @Patch(ServerRoutes.byId)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(UpdateServerRequest))
    body: UpdateServerRequest,
  ): Promise<ServerSummary> {
    return this.servers.update(user.userId, BigInt(id), body);
  }
}
