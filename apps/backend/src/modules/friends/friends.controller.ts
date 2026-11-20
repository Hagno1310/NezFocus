import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateRelationshipRequest,
  RelationshipRoutes,
  SnowflakeId,
  UpdateRelationshipRequest,
  UserLookupQuery,
  type Relationship,
  type UserLookupResponse,
} from '@nezfocus/shared';
import { Idempotent } from '../../common/idempotency.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { FriendsService } from './friends.service.js';

// SRS 5.3 Friend (REQ-FRIEND-01..04).
@Controller()
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get(RelationshipRoutes.list)
  list(@CurrentUser() user: AuthUser): Promise<Relationship[]> {
    return this.friends.list(user.userId);
  }

  @Post(RelationshipRoutes.list)
  @Idempotent()
  send(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateRelationshipRequest))
    body: CreateRelationshipRequest,
  ): Promise<Relationship> {
    return this.friends.send(user.userId, body);
  }

  @Put(RelationshipRoutes.byUser)
  update(
    @CurrentUser() user: AuthUser,
    @Param('userId', new ZodValidationPipe(SnowflakeId)) userId: string,
    @Body(new ZodValidationPipe(UpdateRelationshipRequest))
    body: UpdateRelationshipRequest,
  ): Promise<Relationship> {
    return this.friends.update(user.userId, BigInt(userId), body);
  }

  @Delete(RelationshipRoutes.byUser)
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('userId', new ZodValidationPipe(SnowflakeId)) userId: string,
  ): Promise<void> {
    await this.friends.remove(user.userId, BigInt(userId));
  }

  @Get(RelationshipRoutes.lookup)
  lookup(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(UserLookupQuery)) query: UserLookupQuery,
  ): Promise<UserLookupResponse> {
    return this.friends.lookup(user.userId, query.username);
  }
}
