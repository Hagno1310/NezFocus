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
import { ReadStatesService } from './read-states.service.js';

// SRS 5.3 Message.
@Controller()
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly readStates: ReadStatesService,
  ) {}

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

  // REQ-NOTIF-01: also "Đánh dấu đã đọc" (ack to the channel's last_message_id).
  @Post(MessageRoutes.ack)
  @HttpCode(204)
  async ack(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
  ): Promise<void> {
    await this.readStates.ack(user.userId, BigInt(id), BigInt(messageId));
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
