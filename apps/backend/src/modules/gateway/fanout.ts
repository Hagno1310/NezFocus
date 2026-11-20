import {
  Permission,
  type DispatchEventName,
  type DispatchPayload,
} from '@nezfocus/shared';
import type { PermissionService } from '../permissions/permission.service.js';
import type { ServersRepository } from '../servers/servers.repository.js';
import type { GatewaySessions } from './gateway-sessions.js';

// Ids as strings: an envelope crosses Redis Pub/Sub as JSON.
export type FanoutTarget =
  | { kind: 'user'; userId: string }
  | { kind: 'channel'; channelId: string }
  | { kind: 'server'; serverId: string }
  | {
      kind: 'subscribers';
      serverId: string;
      channelId: string | null;
      except: string | null;
    };

export type Envelope = {
  [T in DispatchEventName]: {
    target: FanoutTarget;
    t: T;
    d: DispatchPayload<T>;
  };
}[DispatchEventName];

// REQ-MSG-07: every instance gets every envelope and delivers to the sessions it holds, so
// only online members cost a permission lookup. PermissionService caches per server and is
// invalidated on every role / overwrite / member change, so a lost VIEW_CHANNEL counts from
// the next event (ROLE-08 AC3).
export class Fanout {
  constructor(
    private readonly sessions: GatewaySessions,
    private readonly servers: Pick<
      ServersRepository,
      'memberIds' | 'findChannel'
    >,
    private readonly permissions: Pick<PermissionService, 'can'>,
  ) {}

  async deliver({ target, t, d }: Envelope) {
    if (target.kind === 'user')
      return this.sessions.dispatchToUser(BigInt(target.userId), t, d);

    if (target.kind === 'server') {
      for (const userId of await this.online(BigInt(target.serverId)))
        await this.sessions.dispatchToUser(userId, t, d);
      return;
    }

    if (target.kind === 'channel') {
      const channelId = BigInt(target.channelId);
      // ponytail: a DM channel (no server) reaches nobody until P2-B3.2 (#115) adds its members.
      const serverId = (await this.servers.findChannel(channelId))?.serverId;
      if (!serverId) return;
      for (const userId of await this.online(serverId))
        if (await this.sees(userId, channelId))
          await this.sessions.dispatchToUser(userId, t, d);
      return;
    }

    const serverId = BigInt(target.serverId);
    const channelId = target.channelId ? BigInt(target.channelId) : null;
    const except = target.except ? BigInt(target.except) : null;
    const subscribers = this.sessions.subscriberIds(serverId);
    if (!subscribers.size) return;
    const members = new Set(await this.servers.memberIds(serverId));
    for (const userId of subscribers)
      if (
        userId !== except &&
        members.has(userId) &&
        (!channelId || (await this.sees(userId, channelId)))
      )
        this.sessions.dispatchToSubscribers(serverId, userId, t, d);
  }

  private async online(serverId: bigint) {
    const here = this.sessions.userIds();
    if (!here.size) return [];
    return (await this.servers.memberIds(serverId)).filter((id) =>
      here.has(id),
    );
  }

  private sees(userId: bigint, channelId: bigint) {
    return this.permissions.can(userId, { channelId }, Permission.VIEW_CHANNEL);
  }
}
