import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ErrorCode, Permission, type ReadState } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { CHANNEL_READ, type ChannelRead } from './message-events.js';
import { MessagesService } from './messages.service.js';
import { ReadStatesRepository } from './read-states.repository.js';

const idOrNull = (id: bigint | null) => (id ? String(id) : null);

// REQ-NOTIF-01: read state kept on the backend, synced to every session by MESSAGE_ACK.
@Injectable()
export class ReadStatesService {
  constructor(
    private readonly repo: ReadStatesRepository,
    private readonly messages: MessagesService,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
    private readonly emitter: EventEmitter2,
  ) {}

  // POST ack: a channel I cannot view, or a message not in it, is 40401 and changes nothing.
  async ack(userId: bigint, channelId: bigint, messageId: bigint) {
    await this.messages.viewable(userId, channelId);
    if (!(await this.repo.messageInChannel(channelId, messageId)))
      throw new AppError(ErrorCode.NotFound, 'Unknown message');
    await this.read(userId, channelId, messageId);
  }

  // Also my own new message: everything up to it is read (NOTIF-01 AC2).
  async read(userId: bigint, channelId: bigint, messageId: bigint) {
    const { lastRead, mentionCount } = await this.repo.ack(
      userId,
      channelId,
      messageId,
    );
    await this.events.toUser(userId, 'MESSAGE_ACK', {
      channel_id: String(channelId),
      message_id: String(lastRead),
      mention_count: mentionCount,
    });
    const read: ChannelRead = { userId, channelId, messageId: lastRead };
    this.emitter.emit(CHANNEL_READ, read);
  }

  markServerRead(userId: bigint, serverId: bigint) {
    return this.repo.markServerRead(userId, serverId);
  }

  // READY (chốt 22/11/2026): one per channel I can view, read or not.
  // ponytail: one permission check per channel; khi READY chậm với nhiều server: tính quyền theo lô.
  async forReady(userId: bigint): Promise<ReadState[]> {
    const out: ReadState[] = [];
    for (const r of await this.repo.forUser(userId))
      if (
        // A DM row is mine already (REQ-DM-01: no RBAC).
        !r.serverId ||
        (await this.permissions.can(
          userId,
          { channelId: r.channelId },
          Permission.VIEW_CHANNEL,
        ))
      )
        out.push({
          channel_id: String(r.channelId),
          server_id: idOrNull(r.serverId),
          last_read_message_id: idOrNull(r.lastReadMessageId),
          last_message_id: idOrNull(r.lastMessageId),
          mention_count: r.mentionCount,
        });
    return out;
  }
}
