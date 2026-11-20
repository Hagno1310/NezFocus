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
// The caller picks the target; the Gateway works out who receives it (REQ-MSG-07) and does the
// permission check itself, so a caller never loops over members. Example (messaging):
//   await this.events.toChannel(channelId, 'MESSAGE_CREATE', { ...message, server_id });
export abstract class EventPublisher {
  // Every session of one user (their own data: USER_UPDATE, SOLO_SESSION_UPDATE…).
  abstract toUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Server channel: members who can VIEW_CHANNEL it (REQ-ROLE-03); DM: its members (P2-B3.2 #115).
  // Required for every event about a channel's content: MESSAGE_*, CHANNEL_CREATE of a private one.
  abstract toChannel<T extends DispatchEventName>(
    channelId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Every member, no permission filter: SERVER_*, roles, CHANNEL_DELETE.
  abstract toServer<T extends DispatchEventName>(
    serverId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ): Promise<void>;
  // Only sessions that SUBSCRIBEd (op 8) to this server; with a channel, only those that can
  // VIEW_CHANNEL it. For detail events: TYPING_START, member-list presence. `except` skips a user.
  abstract toServerSubscribers<T extends DispatchEventName>(
    serverId: bigint,
    channelId: bigint | null,
    t: T,
    d: DispatchPayload<T>,
    except?: bigint,
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

  // ponytail: stand-in until the subscription map of P2-B1.2 (#108): nobody is subscribed yet.
  async toServerSubscribers<T extends DispatchEventName>(
    serverId: bigint,
    _channelId: bigint | null,
    t: T,
  ) {
    this.logger.debug(`${t} to subscribers of ${serverId} dropped`);
  }
}
