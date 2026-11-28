import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CANNOT_MESSAGE_TEXT,
  ErrorCode,
  Permission,
  parseMentions,
  TYPING_CLIENT_INTERVAL_MS,
  messageTypeCode,
  type CreateMessageRequest,
  type MessageHistoryQuery,
  type MessageResponse,
  type MessageType,
} from '@nezfocus/shared';
import { AppError, rateLimited, timedOut } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { isUniqueViolation } from '../../common/db-errors.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import { DmAccessPolicy } from '../channels/dm-access-policy.js';
import { DmRepository } from '../channels/dm.repository.js';
import { BlockQuery } from '../friends/block-query.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { ChannelTypeCode, type ChannelRow } from '../servers/servers.schema.js';
import { MentionsService } from './mentions.service.js';
import { MESSAGE_CREATED, type MessageCreated } from './message-events.js';
import {
  toMessageAuthor,
  toMessageResponse,
  type MessageExtras,
} from './messages.dto.js';
import {
  AttachmentsUnavailable,
  MessagesRepository,
  type MessageWithAuthor,
} from './messages.repository.js';

const unknownChannel = () =>
  new AppError(ErrorCode.NotFound, 'Unknown channel');

// REQ-MSG-05: a reply points at a message of the same channel that is not a system one.
const badReply = () =>
  new AppError(ErrorCode.ValidationError, 'Invalid request', {
    reply_to_id: [
      { code: 'invalid_reply', message: 'Not a message of this channel' },
    ],
  });

// REQ-MSG-04 AC5: completed images of mine for this channel, not sent yet.
const badAttachments = () =>
  new AppError(ErrorCode.ValidationError, 'Invalid request', {
    attachment_ids: [
      {
        code: 'invalid_attachment',
        message: 'Not a completed image of yours for this channel',
      },
    ],
  });

// REQ-MSG-08: 5 messages / 5 s / channel and 30 / minute across every channel, per user.
const PER_CHANNEL = { limit: 5, windowMs: 5_000 };
const PER_USER = { limit: 30, windowMs: 60_000 };

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
    private readonly blocks: BlockQuery,
    private readonly mentions: MentionsService,
    private readonly dmPolicy: DmAccessPolicy,
    private readonly dms: DmRepository,
  ) {}

  async send(
    userId: bigint,
    channelId: bigint,
    body: CreateMessageRequest,
  ): Promise<MessageResponse> {
    const channel = await this.viewable(userId, channelId);
    await this.requireSend(userId, channel);
    const attachmentIds = (body.attachment_ids ?? []).map(BigInt);
    if (attachmentIds.length) await this.requireAttach(userId, channel);
    // A retry of a message already saved gets it back without touching the rate limit.
    const sent = await this.repo.byNonce(userId, body.nonce);
    if (sent) return this.replay(sent, channelId, body.content);
    // REQ-MSG-08 AC1: a refused message does not count toward either window.
    const wait = await this.store.hitWindows([
      { key: `msg-rate:${userId}:${channelId}`, ...PER_CHANNEL },
      { key: `msg-rate:${userId}`, ...PER_USER },
    ]);
    if (wait) throw rateLimited(wait / 1000);

    const replyTo = body.reply_to_id
      ? await this.repo.one(channelId, BigInt(body.reply_to_id))
      : undefined;
    if (
      body.reply_to_id &&
      (!replyTo || replyTo.message.type !== messageTypeCode.default)
    )
      throw badReply();
    const { mentions, concerned } = await this.mentionsOf(
      userId,
      channel,
      body.content,
      // MSG-03 AC3: the original's author, while it still exists.
      replyTo && !replyTo.message.deletedAt
        ? replyTo.message.authorId
        : undefined,
    );
    let saved: MessageWithAuthor;
    try {
      saved = await this.repo.create(
        {
          id: this.ids.next(),
          channelId,
          authorId: userId,
          type: messageTypeCode.default,
          content: body.content,
          nonce: body.nonce,
          replyToId: replyTo?.message.id ?? null,
          ...mentions,
        },
        [...concerned.keys()].map(BigInt),
        attachmentIds,
      );
    } catch (err) {
      if (err instanceof AttachmentsUnavailable) throw badAttachments();
      if (!isUniqueViolation(err, 'uq_messages_author_nonce')) throw err;
      const raced = await this.repo.byNonce(userId, body.nonce);
      if (!raced) throw err;
      return this.replay(raced, channelId, body.content);
    }
    // ponytail: push for mentions / DMs out of the foreground (NOTIF-02) is P3-B5 (#29).
    return this.publish(saved, channel, concerned);
  }

  // REQ-MSG-11: a system message is stored as kind + parameters (CR-24) and sent like any
  // other. Calls (P3-B6 #156), reminders (P4-A1 #164) and room sessions (P3-B7 #160) add
  // their type to MessageResponse and call this.
  async createSystemMessage<T extends Exclude<MessageType, 'default'>>(
    channelId: bigint,
    authorId: bigint,
    type: T,
    systemData: Extract<MessageResponse, { type: T }>['system_data'],
  ): Promise<MessageResponse> {
    const channel = await this.servers.findChannel(channelId);
    if (!channel) throw unknownChannel();
    const saved = await this.repo.create({
      id: this.ids.next(),
      channelId,
      authorId,
      type: messageTypeCode[type],
      systemData,
    });
    return this.publish(saved, channel, new Map());
  }

  private async publish(
    saved: MessageWithAuthor,
    channel: ChannelRow,
    concerned: MessageCreated['concerned'],
  ) {
    // A new message has no reactions, so the same copy goes to everyone.
    const [message] = await this.toResponses([saved], saved.message.authorId);
    if (!message) throw new Error('unreachable');
    const created: MessageCreated = {
      message,
      serverId: channel.serverId,
      concerned,
    };
    this.emitter.emit(MESSAGE_CREATED, created);
    // The sender has its 201 already; the fanout must not hold it (SRS 7.5.1).
    void this.events
      .toChannel(channel.id, 'MESSAGE_CREATE', {
        ...message,
        server_id: channel.serverId?.toString() ?? null,
      })
      .catch((err: unknown) =>
        this.logger.error(`MESSAGE_CREATE ${message.id}`, err),
      );
    return message;
  }

  // REQ-MSG-06 / DEC-33: same checks as sending; a repeat inside the window is 204, not broadcast.
  async typing(userId: bigint, channelId: bigint) {
    const channel = await this.viewable(userId, channelId);
    await this.requireSend(userId, channel);
    // 1 s under the client's interval, so its next call on time is never swallowed.
    const fresh = await this.store.setIfAbsent(
      `typing:${userId}:${channelId}`,
      '1',
      TYPING_CLIENT_INTERVAL_MS / 1000 - 1,
    );
    if (!fresh) return;
    const author = await this.repo.author(userId);
    if (!author) return;
    if (!channel.serverId) {
      // A DM: only the other person; canSend already ruled out a block either way.
      for (const other of (await this.dms.recipients(channelId)) ?? [])
        if (other !== userId)
          await this.events.toUser(other, 'TYPING_START', {
            channel_id: channelId.toString(),
            server_id: null,
            user: toMessageAuthor(author),
            timestamp: this.clock.now().toISOString(),
          });
      return;
    }
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
      // S-HOME-01 (chốt 20/11/2026): not shown to people who blocked the typer.
      [userId, ...(await this.blocks.blockerIds(userId))],
    );
  }

  async history(
    userId: bigint,
    channelId: bigint,
    query: MessageHistoryQuery,
  ): Promise<MessageResponse[]> {
    await this.viewable(userId, channelId);
    return this.toResponses(await this.repo.history(channelId, query), userId);
  }

  // REQ-MSG-05: each message with its reply line and the reactions as `viewerId` sees them.
  async toResponses(
    rows: MessageWithAuthor[],
    viewerId: bigint,
  ): Promise<MessageResponse[]> {
    const ids = rows.map((r) => r.message.id);
    const [referenced, reactions, files] = await Promise.all([
      this.repo.referenced(
        rows.flatMap((r) => (r.message.replyToId ? [r.message.replyToId] : [])),
      ),
      this.repo.reactions(ids, viewerId),
      this.repo.attachmentsOf(ids),
    ]);
    return rows.map((r) => {
      const extras: MessageExtras = {
        referenced: r.message.replyToId
          ? (referenced.get(r.message.replyToId) ?? null)
          : null,
        reactions: reactions
          .filter((x) => x.messageId === r.message.id)
          .map(({ emoji, count, me }) => ({ emoji, count, me })),
        attachments: files.filter((f) => f.messageId === r.message.id),
      };
      return toMessageResponse(r.message, r.author, extras);
    });
  }

  // REQ-MSG-09 AC1: a repeat of the same nonce gets the first message back; the same nonce
  // for another channel or text is a client bug → 40907.
  private async replay(
    sent: MessageWithAuthor,
    channelId: bigint,
    content: string,
  ): Promise<MessageResponse> {
    if (
      sent.message.channelId !== channelId ||
      sent.message.content !== content
    )
      throw new AppError(
        ErrorCode.IdempotencyKeyReused,
        'nonce already used for another message',
      );
    const [message] = await this.toResponses([sent], sent.message.authorId);
    return message!;
  }

  // REQ-ROLE-03 AC3: a channel one cannot view does not exist for them (40401).
  // ponytail: text channels and DMs; voice channel chat opens here with P3-B7 (#160).
  async viewable(userId: bigint, channelId: bigint): Promise<ChannelRow> {
    const channel = await this.servers.findChannel(channelId);
    // REQ-DM-01: a DM is not under server RBAC.
    if (channel?.type === ChannelTypeCode.dm && !channel.deletedAt) {
      if (await this.dmPolicy.canView(userId, channelId)) return channel;
      throw unknownChannel();
    }
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

  // REQ-MSG-04: who may upload an image for this channel (POST /attachments) and send it.
  // A DM has no server permissions: the DM send rule is enough.
  async attachable(userId: bigint, channelId: bigint): Promise<ChannelRow> {
    const channel = await this.viewable(userId, channelId);
    await this.requireSend(userId, channel);
    await this.requireAttach(userId, channel);
    return channel;
  }

  private async requireAttach(userId: bigint, channel: ChannelRow) {
    if (channel.serverId)
      await this.permissions.require(
        userId,
        { channelId: channel.id },
        Permission.ATTACH_FILES,
      );
  }

  // REQ-DM-02 / FRIEND-03 AC1 in a DM: 40303 with one sentence; elsewhere SEND_MESSAGES.
  // REQ-ROLE-05 AC1: a ban's "Xóa tin nhắn gần đây"; one MESSAGE_DELETE_BULK per channel.
  async deleteRecentOf(serverId: bigint, userId: bigint, since: Date) {
    const byChannel = await this.repo.softDeleteByAuthor(
      serverId,
      userId,
      since,
      this.clock.now(),
    );
    for (const [channelId, ids] of byChannel)
      await this.events.toChannel(channelId, 'MESSAGE_DELETE_BULK', {
        ids: ids.map(String),
        channel_id: channelId.toString(),
        server_id: serverId.toString(),
      });
    return [...byChannel.values()].flat();
  }

  // REQ-ROLE-05 AC2: timed out → 40307 with timeout_until, before the 40302 it would also be.
  private async requireSend(userId: bigint, channel: ChannelRow) {
    if (channel.serverId) {
      const until = await this.repo.timeoutUntil(channel.serverId, userId);
      if (until && until > this.clock.now()) throw timedOut(until);
    }
    if (channel.serverId)
      return this.permissions.require(
        userId,
        { channelId: channel.id },
        Permission.SEND_MESSAGES,
      );
    if (!(await this.dmPolicy.canSend(userId, channel.id)))
      throw new AppError(ErrorCode.CannotMessageUser, CANNOT_MESSAGE_TEXT);
  }

  // CR-12 #3: a DM keeps mentions of its people only (for the name), nothing else.
  async mentionsOf(
    userId: bigint,
    channel: ChannelRow,
    content: string,
    replyAuthorId?: bigint,
  ) {
    if (channel.serverId) {
      const mentions = await this.mentions.resolve(userId, channel, content);
      const concerned = await this.mentions.recipients(
        userId,
        channel,
        content,
        mentions,
        replyAuthorId,
      );
      return { mentions, concerned };
    }
    const people = new Set(
      ((await this.dms.recipients(channel.id)) ?? []).map(String),
    );
    return {
      mentions: {
        mentionUserIds: parseMentions(content)
          .mention_user_ids.filter((id) => people.has(id))
          .map(BigInt),
        mentionRoleIds: [],
        mentionEveryone: false,
      },
      concerned: new Map(),
    };
  }
}
