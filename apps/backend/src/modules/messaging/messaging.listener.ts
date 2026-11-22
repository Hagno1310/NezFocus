import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../notifications/notification-service.js';
import { MEMBER_JOINED, type MemberJoined } from '../servers/member-events.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { MESSAGE_CREATED, type MessageCreated } from './message-events.js';
import { MessagesService } from './messages.service.js';
import { ReadStatesService } from './read-states.service.js';

// After the 201: what a new message or a new member sets off. A failure here is logged; the
// message itself is saved already.
@Injectable()
export class MessagingListener {
  private readonly logger = new Logger('MessagingListener');

  constructor(
    private readonly notifications: NotificationService,
    private readonly servers: ServersRepository,
    private readonly messages: MessagesService,
    private readonly readStates: ReadStatesService,
  ) {}

  // REQ-MSG-03 AC2 / NOTIF-05: one `mention` item and +1 mention_count per person (NOTIF-01
  // AC2). DMs and system messages: neither. My own message marks the channel read for me.
  @OnEvent(MESSAGE_CREATED, { promisify: true })
  async created({ message, serverId, concerned }: MessageCreated) {
    try {
      // Also a system message: my own "X đã tham gia server" is not unread for me.
      await this.readStates.read(
        BigInt(message.author.id),
        BigInt(message.channel_id),
        BigInt(message.id),
      );
      if (!serverId) return;
      for (const [userId, via] of concerned)
        await this.notifications.create(BigInt(userId), 'mention', {
          actor_id: message.author.id,
          server_id: String(serverId),
          channel_id: message.channel_id,
          message_id: message.id,
          ...via,
        });
    } catch (err) {
      this.logger.error(`mentions of ${message.id}`, err);
    }
  }

  // REQ-MSG-11 / SRV-04 AC1: "X đã tham gia server" in the welcome channel; AC4: none when off.
  @OnEvent(MEMBER_JOINED, { promisify: true })
  async joined({ serverId, userId }: MemberJoined) {
    try {
      // Before the join message, so it is the first thing unread for everyone else.
      await this.readStates.markServerRead(userId, serverId);
      const server = await this.servers.summary(serverId);
      if (!server?.systemChannelId) return;
      await this.messages.createSystemMessage(
        server.systemChannelId,
        userId,
        'member_join',
        { user_id: String(userId) },
      );
    } catch (err) {
      this.logger.error(`join message ${serverId}/${userId}`, err);
    }
  }
}
