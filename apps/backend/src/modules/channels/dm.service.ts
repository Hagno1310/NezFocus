import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CANNOT_MESSAGE_TEXT,
  ErrorCode,
  type DmChannel,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { isUniqueViolation } from '../../common/db-errors.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import {
  MESSAGE_CREATED,
  type MessageCreated,
} from '../messaging/message-events.js';
import { DmAccessPolicy } from './dm-access-policy.js';
import { isDeletedAccount, toDmChannel } from './dm.dto.js';
import { DmRepository } from './dm.repository.js';

const unknownUser = () => new AppError(ErrorCode.NotFound, 'Unknown user');

// REQ-DM-01..03 (SRS 5.3 DM).
@Injectable()
export class DmService {
  private readonly logger = new Logger('DmService');

  constructor(
    private readonly repo: DmRepository,
    private readonly policy: DmAccessPolicy,
    private readonly events: EventPublisher,
    private readonly ids: SnowflakeGenerator,
  ) {}

  // READY private_channels, newest activity first (S-DM-01).
  async openFor(userId: bigint): Promise<DmChannel[]> {
    return (await this.repo.seenBy(userId)).map(toDmChannel);
  }

  // POST /users/@me/channels. REQ-DM-03 AC1: the pair's DM if any, open again on my side.
  async open(me: bigint, recipientId: bigint): Promise<DmChannel> {
    if (me === recipientId) throw unknownUser();
    const recipient = await this.repo.user(recipientId);
    if (!recipient?.username) throw unknownUser();
    const existing = await this.repo.pairChannel(me, recipientId);
    if (existing) {
      if (await this.repo.reopen(existing, me))
        await this.announce(existing, me);
      return this.seen(existing, me);
    }
    if (isDeletedAccount(recipient.accountStatus)) throw unknownUser();
    if (!(await this.policy.canMessage(me, recipientId)))
      throw new AppError(ErrorCode.CannotMessageUser, CANNOT_MESSAGE_TEXT);
    const channelId = this.ids.next();
    try {
      await this.repo.createPair(channelId, me, recipientId);
    } catch (err) {
      // AC2: the other request of a race created it; answer with that one.
      if (!isUniqueViolation(err)) throw err;
      const raced = await this.repo.pairChannel(me, recipientId);
      if (!raced) throw err;
      return this.seen(raced, me);
    }
    await this.announce(channelId, me);
    await this.announce(channelId, recipientId);
    return this.seen(channelId, me);
  }

  // DELETE /channels/{id} on a DM 1-1 (CR-28): hide it on my side only. false = not a DM,
  // the caller deletes the server channel instead.
  async close(userId: bigint, channelId: bigint): Promise<boolean> {
    const people = await this.repo.recipients(channelId);
    if (!people) return false;
    if (!people.includes(userId))
      throw new AppError(ErrorCode.NotFound, 'Unknown channel');
    await this.repo.setClosed(channelId, userId, true);
    return true;
  }

  // REQ-DM-03: a new message reopens the DM for whoever had closed it, with CHANNEL_CREATE.
  @OnEvent(MESSAGE_CREATED, { promisify: true })
  async reopenOnMessage({ message, serverId }: MessageCreated) {
    if (serverId) return;
    const channelId = BigInt(message.channel_id);
    try {
      for (const userId of await this.repo.reopenAll(channelId))
        await this.announce(channelId, userId);
    } catch (err) {
      this.logger.error(`reopen ${channelId}`, err);
    }
  }

  private async seen(channelId: bigint, userId: bigint) {
    const [row] = await this.repo.seenBy(userId, channelId);
    if (!row) throw new AppError(ErrorCode.NotFound, 'Unknown channel');
    return toDmChannel(row);
  }

  private async announce(channelId: bigint, userId: bigint) {
    await this.events.toUser(
      userId,
      'CHANNEL_CREATE',
      await this.seen(channelId, userId),
    );
  }
}
