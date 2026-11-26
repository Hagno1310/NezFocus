import { Injectable, Logger } from '@nestjs/common';
import {
  CANNOT_MESSAGE_TEXT,
  ErrorCode,
  MAX_PINS,
  MAX_REACTION_EMOJI,
  Permission,
  messageTypeCode,
  type DispatchPayload,
  type EditMessageRequest,
  type MessageResponse,
  type ReactionUsersResponse,
} from '@nezfocus/shared';
import { AppError, rateLimited } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import { DmAccessPolicy } from '../channels/dm-access-policy.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { NotificationService } from '../notifications/notification-service.js';
import { PermissionService } from '../permissions/permission.service.js';
import type { ChannelRow } from '../servers/servers.schema.js';
import { toMessageAuthor } from './messages.dto.js';
import { MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';

type ActionEvent =
  | 'MESSAGE_UPDATE'
  | 'MESSAGE_DELETE'
  | 'MESSAGE_REACTION_ADD'
  | 'MESSAGE_REACTION_REMOVE'
  | 'CHANNEL_PINS_UPDATE';

const unknownMessage = () =>
  new AppError(ErrorCode.NotFound, 'Unknown message');
const forbidden = () => new AppError(ErrorCode.Forbidden, 'Missing permission');

// CR-28 #25: 10 puts / removes in 5 s per user, every channel and DM together.
const REACTIONS = { limit: 10, windowMs: 5_000 };

// REQ-MSG-05: edit, delete and react (reply is a send, MessagesService.send). REQ-MSG-10: pins.
@Injectable()
export class MessageActionsService {
  private readonly logger = new Logger('MessageActionsService');

  constructor(
    private readonly messages: MessagesService,
    private readonly repo: MessagesRepository,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
    private readonly notifications: NotificationService,
    private readonly dmPolicy: DmAccessPolicy,
    private readonly store: KeyValueStore,
    private readonly clock: Clock,
  ) {}

  // A channel I cannot view and a message that is gone are both 40401 (ROLE-03 AC3).
  private async target(userId: bigint, channelId: bigint, messageId: bigint) {
    const channel = await this.messages.viewable(userId, channelId);
    const found = await this.repo.one(channelId, messageId);
    if (!found || found.message.deletedAt) throw unknownMessage();
    return { channel, ...found };
  }

  private emit<T extends ActionEvent>(
    channel: ChannelRow,
    t: T,
    d: Omit<DispatchPayload<T>, 'server_id'>,
  ) {
    // The caller has its answer already; the fanout must not hold it (SRS 7.5.1).
    const payload = {
      ...d,
      server_id: channel.serverId?.toString() ?? null,
    } as DispatchPayload<T>;
    void this.events
      .toChannel(channel.id, t, payload)
      .catch((err: unknown) => this.logger.error(t, err));
  }

  // AC1, AC2 (only the author, MANAGE_MESSAGES or not), MSG-11 AC2 (not a system message).
  // Timed out: 40302 (40307 comes with P3-A3.1 #126); losing SEND_MESSAGES does not stop it.
  async edit(
    userId: bigint,
    channelId: bigint,
    messageId: bigint,
    body: EditMessageRequest,
  ): Promise<MessageResponse> {
    const { channel, message } = await this.target(
      userId,
      channelId,
      messageId,
    );
    if (message.type !== messageTypeCode.default || message.authorId !== userId)
      throw forbidden();
    await this.notTimedOut(userId, channel);
    // CR-28 #27: mentions are worked out again for display; nobody is notified.
    const { mentions } = await this.messages.mentionsOf(
      userId,
      channel,
      body.content,
    );
    const saved = await this.repo.edit(messageId, {
      content: body.content,
      ...mentions,
      editedAt: this.clock.now(),
    });
    const [response] = await this.messages.toResponses([saved], userId);
    this.emit(channel, 'MESSAGE_UPDATE', {
      id: response!.id,
      channel_id: response!.channel_id,
      content: response!.content,
      mention_user_ids: response!.mention_user_ids,
      mention_role_ids: response!.mention_role_ids,
      mention_everyone: response!.mention_everyone,
      edited_at: saved.message.editedAt!.toISOString(),
    });
    return response!;
  }

  // AC3: the author or MANAGE_MESSAGES (no role order); AC7: in a DM only the author. MSG-11:
  // a system message only with MANAGE_MESSAGES, never in a DM. CR-28 #27: timed out still may.
  async delete(userId: bigint, channelId: bigint, messageId: bigint) {
    const { channel, message } = await this.target(
      userId,
      channelId,
      messageId,
    );
    const own =
      message.type === messageTypeCode.default && message.authorId === userId;
    if (
      !own &&
      !(
        channel.serverId &&
        (await this.permissions.can(
          userId,
          { channelId },
          Permission.MANAGE_MESSAGES,
        ))
      )
    )
      throw forbidden();
    if (!(await this.repo.softDelete(channelId, messageId, this.clock.now())))
      throw unknownMessage();
    this.emit(channel, 'MESSAGE_DELETE', {
      id: messageId.toString(),
      channel_id: channelId.toString(),
    });
    // Its mention / reply items go with it (NOTIFICATION_DELETE).
    await this.notifications
      .deleteBySource({ message_id: messageId })
      .catch((err: unknown) => this.logger.error(`items of ${messageId}`, err));
  }

  // AC4, AC5; a new emoji needs ADD_REACTIONS, one already there does not. ROLE-05: not
  // while timed out. CR-28 #27: not on a system message; in a DM, as sending (40303).
  async react(
    userId: bigint,
    channelId: bigint,
    messageId: bigint,
    emoji: string,
  ) {
    const { channel, message } = await this.target(
      userId,
      channelId,
      messageId,
    );
    if (message.type !== messageTypeCode.default) throw forbidden();
    const present = await this.repo.emojiOn(messageId);
    const known = present.includes(emoji);
    await this.mayReact(userId, channel);
    if (channel.serverId && !known)
      await this.permissions.require(
        userId,
        { channelId },
        Permission.ADD_REACTIONS,
      );
    if (!known && present.length >= MAX_REACTION_EMOJI)
      throw new AppError(
        ErrorCode.MaxReactionsReached,
        `At most ${MAX_REACTION_EMOJI} different emoji`,
      );
    await this.hitLimit(userId);
    if (await this.repo.addReaction(messageId, emoji, userId))
      this.emit(
        channel,
        'MESSAGE_REACTION_ADD',
        this.reaction(userId, channelId, messageId, emoji),
      );
  }

  async unreact(
    userId: bigint,
    channelId: bigint,
    messageId: bigint,
    emoji: string,
  ) {
    const { channel } = await this.target(userId, channelId, messageId);
    await this.mayReact(userId, channel);
    await this.hitLimit(userId);
    if (await this.repo.removeReaction(messageId, emoji, userId))
      this.emit(
        channel,
        'MESSAGE_REACTION_REMOVE',
        this.reaction(userId, channelId, messageId, emoji),
      );
  }

  // REQ-MSG-10 AC1: a `channel_pinned` system message by the pinner (MSG-11), once.
  async pin(userId: bigint, channelId: bigint, messageId: bigint) {
    const { channel, message } = await this.target(
      userId,
      channelId,
      messageId,
    );
    if (message.type !== messageTypeCode.default) throw forbidden();
    await this.mayPin(userId, channel);
    const at = this.clock.now();
    const done = await this.repo.pin(
      channelId,
      messageId,
      userId,
      at,
      MAX_PINS,
    );
    if (done === 'full')
      throw new AppError(
        ErrorCode.MaxPinsReached,
        `At most ${MAX_PINS} pinned messages`,
      );
    if (done === 'already') return;
    this.pinsChanged(channel, messageId, at);
    await this.messages.createSystemMessage(
      channelId,
      userId,
      'channel_pinned',
      {
        message_id: messageId.toString(),
      },
    );
  }

  // CR-28 #28: no system message for an unpin.
  async unpin(userId: bigint, channelId: bigint, messageId: bigint) {
    const { channel } = await this.target(userId, channelId, messageId);
    await this.mayPin(userId, channel);
    if (await this.repo.unpin(messageId))
      this.pinsChanged(channel, messageId, null);
  }

  // CR-28 #28 (g): the app updates its cached copy from message_id + pinned_at.
  private pinsChanged(channel: ChannelRow, messageId: bigint, at: Date | null) {
    this.emit(channel, 'CHANNEL_PINS_UPDATE', {
      channel_id: channel.id.toString(),
      message_id: messageId.toString(),
      pinned_at: at?.toISOString() ?? null,
    });
  }

  async pins(userId: bigint, channelId: bigint): Promise<MessageResponse[]> {
    await this.messages.viewable(userId, channelId);
    return this.messages.toResponses(await this.repo.pins(channelId), userId);
  }

  // AC3: MANAGE_MESSAGES in a server; AC4: anyone in a DM, as sending (CR-28 #28: 40303).
  // Not while timed out.
  private async mayPin(userId: bigint, channel: ChannelRow) {
    await this.notTimedOut(userId, channel);
    if (channel.serverId) {
      if (
        !(await this.permissions.can(
          userId,
          { channelId: channel.id },
          Permission.MANAGE_MESSAGES,
        ))
      )
        throw forbidden();
      return;
    }
    if (!(await this.dmPolicy.canSend(userId, channel.id)))
      throw new AppError(ErrorCode.CannotMessageUser, CANNOT_MESSAGE_TEXT);
  }

  // CR-28 #26: "Ai đã thả cảm xúc".
  async reactionUsers(
    userId: bigint,
    channelId: bigint,
    messageId: bigint,
    emoji: string,
  ): Promise<ReactionUsersResponse> {
    await this.target(userId, channelId, messageId);
    const rows = await this.repo.reactionUsers(messageId, emoji);
    return rows.map(toMessageAuthor);
  }

  private reaction(
    userId: bigint,
    channelId: bigint,
    messageId: bigint,
    emoji: string,
  ) {
    return {
      user_id: userId.toString(),
      channel_id: channelId.toString(),
      message_id: messageId.toString(),
      emoji,
    };
  }

  // ROLE-05: a timeout ends by the clock, and an emoji already on the message needs no
  // permission, so PermissionService alone cannot say this.
  private async notTimedOut(userId: bigint, channel: ChannelRow) {
    if (!channel.serverId) return;
    const until = await this.repo.timeoutUntil(channel.serverId, userId);
    if (until && until > this.clock.now()) throw forbidden();
  }

  // Putting and removing alike (CR-28 #27): not timed out; in a DM, as sending (40303).
  private async mayReact(userId: bigint, channel: ChannelRow) {
    await this.notTimedOut(userId, channel);
    if (!channel.serverId && !(await this.dmPolicy.canSend(userId, channel.id)))
      throw new AppError(ErrorCode.CannotMessageUser, CANNOT_MESSAGE_TEXT);
  }

  private async hitLimit(userId: bigint) {
    const wait = await this.store.hitWindows([
      { key: `reaction-rate:${userId}`, ...REACTIONS },
    ]);
    if (wait) throw rateLimited(wait / 1000);
  }
}
