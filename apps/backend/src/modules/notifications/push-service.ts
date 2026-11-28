import { Injectable, Logger } from '@nestjs/common';
import {
  concealPush,
  isDataPush,
  parseMentions,
  PushPayload,
  type Locale,
  type NotificationData,
  type NotificationType,
  type PushRequest,
  type PushType,
} from '@nezfocus/shared';
import { BlockQuery } from '../friends/block-query.js';
import { ForegroundReader } from '../gateway/foreground.js';
import { SettingsService } from '../users/settings.service.js';
import { PushContentRepository } from './push-content.repository.js';
import { messageBody, pushText, type PushSubject } from './push-text.js';
import { PushTokensRepository } from './push-tokens.repository.js';
import { PushQueue } from './push.queue.js';

// REQ-NOTIF-02, CR-28 #36: push without an inbox item (DM, calls); items push from
// NotificationService.create. Owner: notifications (B), injected by others (WORKFLOW 4.3).
export abstract class PushService {
  abstract send(userId: bigint, request: PushRequest): Promise<void>;
}

// Inbox types that push. ponytail: task_assigned (P4-A1.2 #163) and task_reminder → deadline
// (P4-A1.3 #164) add their text here with their item.
const ITEM_PUSH: Partial<Record<NotificationType, PushType>> = {
  mention: 'mention',
  reply: 'reply',
  friend_request: 'friend_request',
  owner_transferred: 'owner_transferred',
};

// What a push is about, before its text is written in the recipient's language.
type Draft = Omit<PushPayload, 'title' | 'body'> & {
  actorId: bigint;
  subject: PushSubject;
};

@Injectable()
export class PushDispatcher extends PushService {
  private readonly logger = new Logger('Push');

  constructor(
    private readonly foreground: ForegroundReader,
    private readonly blocks: BlockQuery,
    private readonly settings: SettingsService,
    private readonly tokens: PushTokensRepository,
    private readonly content: PushContentRepository,
    private readonly queue: PushQueue,
  ) {
    super();
  }

  async send(userId: bigint, request: PushRequest) {
    if (request.type !== 'dm') return; // ponytail: calls are P3-B6.2 (#156)
    await this.deliver(userId, 'dm', async (locale) => {
      const message = await this.content.message(BigInt(request.message_id));
      if (!message) return null;
      return {
        type: 'dm',
        id: request.message_id,
        channel_id: request.channel_id,
        message_id: request.message_id,
        actorId: message.authorId,
        subject: {
          type: 'dm',
          actor: await this.name(message.authorId),
          body: await this.body(message.content, message.images, locale),
        },
      };
    });
  }

  async forItem<T extends NotificationType>(
    userId: bigint,
    itemId: bigint,
    type: T,
    data: NotificationData<T>,
  ) {
    const pushType = ITEM_PUSH[type];
    if (!pushType) return;
    const actorId = BigInt((data as { actor_id: string }).actor_id);
    const id = String(itemId);
    await this.deliver(userId, pushType, async (locale) => {
      if (pushType === 'friend_request') {
        const actor = (await this.content.people([actorId])).get(
          String(actorId),
        );
        if (!actor) return null;
        return {
          type: 'friend_request',
          id,
          actorId,
          subject: {
            type: 'friend_request',
            actor: actor.name,
            username: actor.username,
            note: await this.content.requestNote(actorId, userId),
          },
        };
      }
      if (pushType === 'owner_transferred') {
        const { server_id } = data as NotificationData<'owner_transferred'>;
        const server = await this.content.serverName(server_id);
        if (!server) return null;
        return {
          type: 'owner_transferred',
          id,
          server_id,
          actorId,
          subject: {
            type: 'owner_transferred',
            actor: await this.name(actorId),
            server,
          },
        };
      }
      const source = data as NotificationData<'mention'>;
      const message = await this.content.message(BigInt(source.message_id));
      if (!message) return null; // deleted before the push went out
      const actor = await this.name(actorId);
      const channel = message.channelName ?? '';
      const body = await this.body(message.content, message.images, locale);
      const ids = {
        id,
        server_id: source.server_id,
        channel_id: source.channel_id,
        message_id: source.message_id,
        actorId,
      };
      if (pushType === 'reply')
        return {
          ...ids,
          type: 'reply',
          subject: { type: 'reply', actor, channel, body },
        };
      const role =
        source.via === 'role'
          ? await this.content.roleName(source.role_id)
          : undefined;
      return {
        ...ids,
        type: 'mention',
        subject: {
          type: 'mention',
          actor,
          channel,
          via: source.via,
          role,
          body,
        },
      };
    });
  }

  // Never throws: a push that cannot go out must not fail what set it off.
  private async deliver(
    userId: bigint,
    type: PushType,
    draft: (locale: Locale) => Promise<Draft | null>,
  ) {
    try {
      if (!isDataPush(type) && this.foreground.inForeground(userId)) return;
      const tokens = await this.tokens.fcmTokens(userId);
      if (!tokens.length) return;
      const settings = await this.settings.get(userId);
      const drafted = await draft(settings.locale);
      if (!drafted) return;
      const { actorId, subject, ...ids } = drafted;
      // REQ-NOTIF-02 AC4, REQ-FRIEND-03 (CR-28 #36: either way).
      if (await this.blocks.isBlockedEitherWay(userId, actorId)) return;
      const shown = { ...ids, ...pushText(subject, settings.locale) };
      const payload = PushPayload.parse(
        settings.hide_push_content
          ? concealPush(shown, settings.locale)
          : shown,
      );
      await this.queue.add(tokens.map((token) => ({ token, payload })));
    } catch (err) {
      this.logger.error(`push ${type} to ${userId}`, err);
    }
  }

  private async name(id: bigint) {
    return (await this.content.people([id])).get(String(id))?.name ?? '';
  }

  private async body(content: string, images: number, locale: Locale) {
    const m = parseMentions(content);
    const names = await this.content.names(
      m.mention_user_ids,
      m.mention_role_ids,
      m.mention_channel_ids,
    );
    return messageBody(content, images, names, locale);
  }
}
