import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateMessageRequest,
  MessageHistoryQuery,
  MessageRoutes,
  SnowflakeId,
  TypingRoutes,
  type MessageListResponse,
  type MessageResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { MessagesService } from './messages.service.js';

// SRS 5.3 Message. The ack route (REQ-NOTIF-01) arrives with P2-A4.2 (#104).
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post(MessageRoutes.list)
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Body(new ZodValidationPipe(CreateMessageRequest))
    body: CreateMessageRequest,
  ): Promise<MessageResponse> {
    return this.messages.send(user.userId, BigInt(id), body);
  }

  @Get(MessageRoutes.list)
  history(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Query(new ZodValidationPipe(MessageHistoryQuery))
    query: MessageHistoryQuery,
  ): Promise<MessageListResponse> {
    return this.messages.history(user.userId, BigInt(id), query);
  }

  @Post(TypingRoutes.start)
  @HttpCode(204)
  async typing(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<void> {
    await this.messages.typing(user.userId, BigInt(id));
  }
}
