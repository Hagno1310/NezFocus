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
  Query,
} from '@nestjs/common';
import {
  CreateMessageRequest,
  EditMessageRequest,
  MessageHistoryQuery,
  MessageRoutes,
  ReactionEmoji,
  SnowflakeId,
  TypingRoutes,
  type MessageListResponse,
  type MessageResponse,
  type ReactionUsersResponse,
} from '@nezfocus/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { MessageActionsService } from './message-actions.service.js';
import { MessagesService } from './messages.service.js';
import { ReadStatesService } from './read-states.service.js';

// SRS 5.3 Message.
@Controller()
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly readStates: ReadStatesService,
    private readonly actions: MessageActionsService,
  ) {}

  // REQ-MSG-05
  @Patch(MessageRoutes.message)
  edit(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
    @Body(new ZodValidationPipe(EditMessageRequest)) body: EditMessageRequest,
  ): Promise<MessageResponse> {
    return this.actions.edit(user.userId, BigInt(id), BigInt(messageId), body);
  }

  @Delete(MessageRoutes.message)
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
  ): Promise<void> {
    await this.actions.delete(user.userId, BigInt(id), BigInt(messageId));
  }

  @Put(MessageRoutes.myReaction)
  @HttpCode(204)
  async react(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
    @Param('emoji', new ZodValidationPipe(ReactionEmoji)) emoji: string,
  ): Promise<void> {
    await this.actions.react(user.userId, BigInt(id), BigInt(messageId), emoji);
  }

  @Delete(MessageRoutes.myReaction)
  @HttpCode(204)
  async unreact(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
    @Param('emoji', new ZodValidationPipe(ReactionEmoji)) emoji: string,
  ): Promise<void> {
    await this.actions.unreact(
      user.userId,
      BigInt(id),
      BigInt(messageId),
      emoji,
    );
  }

  // REQ-MSG-10
  @Get(MessageRoutes.pins)
  pins(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
  ): Promise<MessageListResponse> {
    return this.actions.pins(user.userId, BigInt(id));
  }

  @Put(MessageRoutes.pin)
  @HttpCode(204)
  async pin(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
  ): Promise<void> {
    await this.actions.pin(user.userId, BigInt(id), BigInt(messageId));
  }

  @Delete(MessageRoutes.pin)
  @HttpCode(204)
  async unpin(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
  ): Promise<void> {
    await this.actions.unpin(user.userId, BigInt(id), BigInt(messageId));
  }

  // CR-28 #26
  @Get(MessageRoutes.reaction)
  reactionUsers(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(SnowflakeId)) id: string,
    @Param('messageId', new ZodValidationPipe(SnowflakeId)) messageId: string,
    @Param('emoji', new ZodValidationPipe(ReactionEmoji)) emoji: string,
  ): Promise<ReactionUsersResponse> {
    return this.actions.reactionUsers(
      user.userId,
      BigInt(id),
      BigInt(messageId),
      emoji,
    );
  }

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
