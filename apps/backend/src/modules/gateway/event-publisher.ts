import { Injectable, Logger } from '@nestjs/common';
import {
  Permission,
  type DispatchEventName,
  type DispatchPayload,
} from '@nezfocus/shared';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { GatewaySessions } from './gateway-sessions.js';

// SRS 5.4 DISPATCH. Owner: gateway (B). Other modules inject this and never touch sockets.
export abstract class EventPublisher {
  abstract toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Members who can VIEW_CHANNEL (REQ-ROLE-03); the real fanout is P2-B1 (#18).
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

  constructor(
    private readonly sessions: GatewaySessions,
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
  ) {
    super();
  }

  toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    return this.sessions.dispatchToUser(userId, t, d);
  }

  // ponytail: stand-in from P2-A3.2 (#100) so MESSAGE_CREATE reaches who can VIEW_CHANNEL:
  // one permission lookup per member and event, DMs dropped. P2-B1.2 (#108) replaces it.
  async toChannel<T extends DispatchEventName>(
    channelId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    const serverId = (await this.servers.findChannel(channelId))?.serverId;
    if (!serverId) {
      this.logger.warn(`${t} to channel ${channelId} dropped: no server`);
      return;
    }
    for (const userId of await this.servers.memberIds(serverId))
      if (
        await this.permissions.can(
          userId,
          { channelId },
          Permission.VIEW_CHANNEL,
        )
      )
        await this.sessions.dispatchToUser(userId, t, d);
  }

  // ponytail: stand-in from P1-A2.1 (#58) so CHANNEL_* / SERVER_UPDATE reach the other
  // members (REQ-SRV-02 AC1): one membership read per event, then toUser for each member.
  // P2-B1.2 (#108) replaces it with the subscription map + Redis Pub/Sub.
  async toServer<T extends DispatchEventName>(
    serverId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    for (const userId of await this.servers.memberIds(serverId))
      await this.sessions.dispatchToUser(userId, t, d);
  }
}
