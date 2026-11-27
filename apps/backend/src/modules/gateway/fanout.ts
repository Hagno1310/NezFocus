import {
  Permission,
  type DispatchEventName,
  type DispatchPayload,
} from '@nezfocus/shared';
import type { DmRepository } from '../channels/dm.repository.js';
import type { PermissionService } from '../permissions/permission.service.js';
import type { ServersRepository } from '../servers/servers.repository.js';
import type { GatewaySessions } from './gateway-sessions.js';

// Ids as strings: an envelope crosses Redis Pub/Sub as JSON.
export type FanoutTarget =
  | { kind: 'user'; userId: string }
  | { kind: 'login'; authSessionId: string }
  | { kind: 'channel'; channelId: string; except?: string[] }
  | { kind: 'server'; serverId: string }
  | {
      kind: 'subscribers';
      serverId: string;
      channelId: string | null;
      except: string[];
    };

export type Envelope = {
  [T in DispatchEventName]: {
    target: FanoutTarget;
    t: T;
    d: DispatchPayload<T>;
  };
}[DispatchEventName];

// REQ-MSG-07 / ROLE-08 AC3: online members only, re-checked per event via PermissionService's cache.
export class Fanout {
  constructor(
    private readonly sessions: GatewaySessions,
    private readonly servers: Pick<
      ServersRepository,
      'memberIds' | 'findChannel'
    >,
    private readonly permissions: Pick<PermissionService, 'can'>,
    private readonly dms: Pick<DmRepository, 'recipients'>,
  ) {}

  async deliver({ target, t, d }: Envelope) {
    if (target.kind === 'user')
      return this.sessions.dispatchToUser(BigInt(target.userId), t, d);
    if (target.kind === 'login')
      return this.sessions.dispatchToLogin(BigInt(target.authSessionId), t, d);

    if (target.kind === 'server') {
      for (const userId of await this.online(BigInt(target.serverId)))
        await this.sessions.dispatchToUser(userId, t, d);
      return;
    }

    if (target.kind === 'channel') {
      const channelId = BigInt(target.channelId);
      const serverId = (await this.servers.findChannel(channelId))?.serverId;
      if (!serverId) {
        // REQ-DM-01: a DM reaches its two people, no RBAC.
        for (const userId of (await this.dms.recipients(channelId)) ?? [])
          await this.sessions.dispatchToUser(userId, t, d);
        return;
      }
      const except = new Set(target.except?.map(BigInt));
      for (const userId of await this.online(serverId))
        if (!except.has(userId) && (await this.sees(userId, channelId)))
          await this.sessions.dispatchToUser(userId, t, d);
      return;
    }

    const serverId = BigInt(target.serverId);
    const channelId = target.channelId ? BigInt(target.channelId) : null;
    const except = new Set(target.except.map(BigInt));
    const subscribers = this.sessions.subscriberIds(serverId);
    if (!subscribers.size) return;
    const members = new Set(await this.servers.memberIds(serverId));
    for (const userId of subscribers)
      if (
        !except.has(userId) &&
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
