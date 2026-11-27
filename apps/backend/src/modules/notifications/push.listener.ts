import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  MESSAGE_CREATED,
  type MessageCreated,
} from '../messaging/message-events.js';
import { PushContentRepository } from './push-content.repository.js';
import { PushService } from './push-service.js';

// REQ-NOTIF-02: a DM has no inbox item (CR-12), so its push starts from the message itself.
@Injectable()
export class PushListener {
  private readonly logger = new Logger('PushListener');

  constructor(
    private readonly push: PushService,
    private readonly content: PushContentRepository,
  ) {}

  @OnEvent(MESSAGE_CREATED, { promisify: true })
  async created({ message, serverId }: MessageCreated) {
    if (serverId !== null || message.type !== 'default') return;
    try {
      const recipients = await this.content.dmRecipients(
        BigInt(message.channel_id),
      );
      for (const userId of recipients)
        if (String(userId) !== message.author.id)
          await this.push.send(userId, {
            type: 'dm',
            message_id: message.id,
            channel_id: message.channel_id,
          });
    } catch (err) {
      this.logger.error(`DM push ${message.id}`, err);
    }
  }
}
