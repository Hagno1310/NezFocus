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
  CreateRoleRequest,
  RoleRoutes,
  SnowflakeId,
  UpdateRolePositionsRequest,
  UpdateRoleRequest,
  type RoleListResponse,
  type RoleResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { RolesService } from './roles.service.js';

const idParam = new ZodValidationPipe(SnowflakeId);

// SRS 5.3 Role (REQ-ROLE-01/02). `positions` is declared before `:roleId`.
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get(RoleRoutes.list)
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
  ): Promise<RoleListResponse> {
    return this.roles.list(user.userId, BigInt(id));
  }

  @Post(RoleRoutes.list)
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(CreateRoleRequest)) body: CreateRoleRequest,
  ): Promise<RoleResponse> {
    return this.roles.create(user.userId, BigInt(id), body);
  }

  @Patch(RoleRoutes.positions)
  @HttpCode(204)
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(UpdateRolePositionsRequest))
    body: UpdateRolePositionsRequest,
  ): Promise<void> {
    return this.roles.reorder(user.userId, BigInt(id), body);
  }

  @Patch(RoleRoutes.byId)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('roleId', idParam) roleId: string,
    @Body(new ZodValidationPipe(UpdateRoleRequest)) body: UpdateRoleRequest,
  ): Promise<RoleResponse> {
    return this.roles.update(user.userId, BigInt(id), BigInt(roleId), body);
  }

  @Delete(RoleRoutes.byId)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', idParam) id: string,
    @Param('roleId', idParam) roleId: string,
  ): Promise<void> {
    return this.roles.remove(user.userId, BigInt(id), BigInt(roleId));
  }
}
