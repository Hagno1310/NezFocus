import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { DispatchEventName, DispatchPayload } from '@nezfocus/shared';
import type { Redis } from 'ioredis';
import { REDIS } from '../../redis/redis.module.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { Fanout, type Envelope, type FanoutTarget } from './fanout.js';
import { GatewaySessions } from './gateway-sessions.js';

// SRS 5.4 / REQ-MSG-07: callers pick a target, the Gateway picks and permission-checks receivers.
// e.g. `await this.events.toChannel(channelId, 'MESSAGE_CREATE', { ...message, server_id })`
export abstract class EventPublisher {
  // A user's own data (USER_UPDATE, SOLO_SESSION_UPDATE…), every session of theirs.
  abstract toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Channel content (MESSAGE_*, CHANNEL_CREATE): only who can VIEW_CHANNEL (ROLE-03); DM: P2-B3.2 (#115).
  abstract toChannel<T extends DispatchEventName>(
    channelId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Nothing secret (SERVER_*, roles, CHANNEL_DELETE's id): every member, no permission filter.
  abstract toServer<T extends DispatchEventName>(
    serverId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Detail events (TYPING_START): op 8 subscribers only, VIEW_CHANNEL-filtered with a channel.
  abstract toServerSubscribers<T extends DispatchEventName>(
    serverId: bigint,
    channelId: bigint | null,
    t: T,
    d: DispatchPayload<T>,
    except?: readonly bigint[], // the sender, people who blocked them
  ): Promise<void>;
}

const TOPIC = 'gateway:dispatch';

// REQ-MSG-07 (đồ án): Redis Pub/Sub to every instance, each delivers to its own sessions.
// ponytail: khi chạy production (MSG-07 AC2): publish only to the node holding the connection.
@Injectable()
export class GatewayEventPublisher
  extends EventPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('EventPublisher');
  private readonly subscriber: Redis;
  private readonly fanout: Fanout;
  // One at a time, so events reach a session in the order they were published.
  // ponytail: khi một lần fanout chậm làm trễ event khác: một hàng cho mỗi người nhận.
  private delivering = Promise.resolve();

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    sessions: GatewaySessions,
    servers: ServersRepository,
    permissions: PermissionService,
  ) {
    super();
    this.subscriber = redis.duplicate();
    this.fanout = new Fanout(sessions, servers, permissions);
  }

  async onModuleInit() {
    this.subscriber.on('message', (_topic: string, text: string) => {
      const envelope = JSON.parse(text) as Envelope;
      this.delivering = this.delivering
        .then(() => this.fanout.deliver(envelope))
        .catch((err: unknown) =>
          this.logger.error(`${envelope.t} not delivered`, err),
        );
    });
    await this.subscriber.subscribe(TOPIC);
  }

  onModuleDestroy() {
    this.subscriber.disconnect();
  }

  toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    return this.publish({ kind: 'user', userId: userId.toString() }, t, d);
  }

  toChannel<T extends DispatchEventName>(
    channelId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    return this.publish(
      { kind: 'channel', channelId: channelId.toString() },
      t,
      d,
    );
  }

  toServer<T extends DispatchEventName>(
    serverId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    return this.publish(
      { kind: 'server', serverId: serverId.toString() },
      t,
      d,
    );
  }

  toServerSubscribers<T extends DispatchEventName>(
    serverId: bigint,
    channelId: bigint | null,
    t: T,
    d: DispatchPayload<T>,
    except: readonly bigint[] = [],
  ) {
    return this.publish(
      {
        kind: 'subscribers',
        serverId: serverId.toString(),
        channelId: channelId?.toString() ?? null,
        except: except.map(String),
      },
      t,
      d,
    );
  }

  private async publish<T extends DispatchEventName>(
    target: FanoutTarget,
    t: T,
    d: DispatchPayload<T>,
  ) {
    await this.redis.publish(TOPIC, JSON.stringify({ target, t, d }));
  }
}
