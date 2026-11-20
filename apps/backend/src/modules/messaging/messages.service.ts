import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ErrorCode,
  Permission,
  TYPING_CLIENT_INTERVAL_MS,
  messageTypeCode,
  type CreateMessageRequest,
  type MessageHistoryQuery,
  type MessageResponse,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { isUniqueViolation } from '../../common/db-errors.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { ChannelTypeCode, type ChannelRow } from '../servers/servers.schema.js';
import { MESSAGE_CREATED, type MessageCreated } from './message-events.js';
import { toMessageAuthor, toMessageResponse } from './messages.dto.js';
import {
  MessagesRepository,
  type MessageWithAuthor,
} from './messages.repository.js';

const unknownChannel = () =>
  new AppError(ErrorCode.NotFound, 'Unknown channel');

// REQ-MSG-01, MSG-09, SEARCH-02 (SRS 7.5.1).
@Injectable()
export class MessagesService {
  private readonly logger = new Logger('MessagesService');

  constructor(
    private readonly repo: MessagesRepository,
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
    private readonly emitter: EventEmitter2,
    private readonly ids: SnowflakeGenerator,
    private readonly store: KeyValueStore,
    private readonly clock: Clock,
  ) {}

  async send(
    userId: bigint,
    channelId: bigint,
    body: CreateMessageRequest,
  ): Promise<MessageResponse> {
    const channel = await this.viewable(userId, channelId);
    await this.permissions.require(
      userId,
      { channelId },
      Permission.SEND_MESSAGES,
    );
    // ponytail: rate limit (REQ-MSG-08, 40029) goes here, P2-A4.1 (#103).
    // ponytail: timed-out members get 40302 instead of 40307 until P3-A3.1 (#126).
    const sent = await this.repo.byNonce(userId, body.nonce);
    if (sent) return this.replay(sent, channelId, body.content);

    let saved: MessageWithAuthor;
    try {
      saved = await this.repo.create({
        id: this.ids.next(),
        channelId,
        authorId: userId,
        type: messageTypeCode.default,
        content: body.content,
        nonce: body.nonce,
      });
    } catch (err) {
      if (!isUniqueViolation(err, 'uq_messages_author_nonce')) throw err;
      const raced = await this.repo.byNonce(userId, body.nonce);
      if (!raced) throw err;
      return this.replay(raced, channelId, body.content);
    }

    const message = toMessageResponse(saved.message, saved.author);
    const created: MessageCreated = { message, serverId: channel.serverId };
    this.emitter.emit(MESSAGE_CREATED, created);
    // The sender has its 201 already; the fanout must not hold it (SRS 7.5.1).
    void this.events
      .toChannel(channelId, 'MESSAGE_CREATE', {
        ...message,
        server_id: channel.serverId?.toString() ?? null,
      })
      .catch((err: unknown) =>
        this.logger.error(`MESSAGE_CREATE ${message.id}`, err),
      );
    // ponytail: push for mentions / DMs out of the foreground (NOTIF-02) is P3-B5 (#29).
    return message;
  }

  // REQ-MSG-06 / DEC-33: same checks as sending; a repeat inside the window is 204, not broadcast.
  async typing(userId: bigint, channelId: bigint) {
    const channel = await this.viewable(userId, channelId);
    await this.permissions.require(
      userId,
      { channelId },
      Permission.SEND_MESSAGES,
    );
    // 1 s under the client's interval, so its next call on time is never swallowed.
    const fresh = await this.store.setIfAbsent(
      `typing:${userId}:${channelId}`,
      '1',
      TYPING_CLIENT_INTERVAL_MS / 1000 - 1,
    );
    if (!fresh || !channel.serverId) return;
    const author = await this.repo.author(userId);
    if (!author) return;
    // ponytail: skip receivers who blocked the typer once blocking lands, P2-B2.2 (#111).
    await this.events.toServerSubscribers(
      channel.serverId,
      channelId,
      'TYPING_START',
      {
        channel_id: channelId.toString(),
        server_id: channel.serverId.toString(),
        user: toMessageAuthor(author),
        timestamp: this.clock.now().toISOString(),
      },
      userId,
    );
  }

  async history(
    userId: bigint,
    channelId: bigint,
    query: MessageHistoryQuery,
  ): Promise<MessageResponse[]> {
    await this.viewable(userId, channelId);
    const rows = await this.repo.history(channelId, query);
    return rows.map((r) => toMessageResponse(r.message, r.author));
  }

  // REQ-MSG-09 AC1: a repeat of the same nonce gets the first message back; the same nonce
  // for another channel or text is a client bug → 40907.
  private replay(
    sent: MessageWithAuthor,
    channelId: bigint,
    content: string,
  ): MessageResponse {
    if (
      sent.message.channelId !== channelId ||
      sent.message.content !== content
    )
      throw new AppError(
        ErrorCode.IdempotencyKeyReused,
        'nonce already used for another message',
      );
    return toMessageResponse(sent.message, sent.author);
  }

  // REQ-ROLE-03 AC3: a channel one cannot view does not exist for them (40401).
  // ponytail: text channels only; DMs wait for DmAccessPolicy, P2-B3.1 (#114), and voice
  // channel chat for P3-B7 (#160) — both open here.
  private async viewable(
    userId: bigint,
    channelId: bigint,
  ): Promise<ChannelRow> {
    const channel = await this.servers.findChannel(channelId);
    if (
      channel?.type !== ChannelTypeCode.text ||
      !channel.serverId ||
      !(await this.servers.isMember(channel.serverId, userId)) ||
      !(await this.permissions.can(
        userId,
        { channelId },
        Permission.VIEW_CHANNEL,
      ))
    )
      throw unknownChannel();
    return channel;
  }
}
