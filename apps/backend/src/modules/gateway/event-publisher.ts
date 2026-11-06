import { Injectable, Logger } from '@nestjs/common';
import type { DispatchEventName, DispatchPayload } from '@nezfocus/shared';

// SRS 5.4 DISPATCH. Owner: gateway (B). Other modules inject this and never touch sockets.
export abstract class EventPublisher {
  // Every Gateway session of the user (all devices).
  abstract toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Members who can VIEW_CHANNEL; filtering lands in P2-B1 (#18).
  abstract toChannel<T extends DispatchEventName>(
    channelId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  abstract toServer<T extends DispatchEventName>(
    serverId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
}

// ponytail: stand-in until P0-5.2 (#51); only logs.
@Injectable()
export class LogEventPublisher extends EventPublisher {
  private readonly logger = new Logger('EventPublisher');

  private log(target: string, t: string) {
    this.logger.log(`would dispatch ${t} to ${target}`);
    return Promise.resolve();
  }

  toUser(userId: bigint, t: DispatchEventName) {
    return this.log(`user ${userId}`, t);
  }

  toChannel(channelId: bigint, t: DispatchEventName) {
    return this.log(`channel ${channelId}`, t);
  }

  toServer(serverId: bigint, t: DispatchEventName) {
    return this.log(`server ${serverId}`, t);
  }
}
