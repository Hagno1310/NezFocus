import { Injectable, Logger } from '@nestjs/common';
import type { DispatchEventName, DispatchPayload } from '@nezfocus/shared';
import { GatewaySessions } from './gateway-sessions.js';

// SRS 5.4 DISPATCH. Owner: gateway (B). Other modules inject this and never touch sockets.
export abstract class EventPublisher {
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

@Injectable()
export class GatewayEventPublisher extends EventPublisher {
  private readonly logger = new Logger('EventPublisher');

  constructor(private readonly sessions: GatewaySessions) {
    super();
  }

  toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    return this.sessions.dispatchToUser(userId, t, d);
  }

  // ponytail: needs membership + VIEW_CHANNEL (P2-B1 #18); logs until then.
  async toChannel(channelId: bigint, t: DispatchEventName) {
    this.logger.warn(`${t} to channel ${channelId} dropped: not wired yet`);
  }

  async toServer(serverId: bigint, t: DispatchEventName) {
    this.logger.warn(`${t} to server ${serverId} dropped: not wired yet`);
  }
}
