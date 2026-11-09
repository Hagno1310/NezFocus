import { Injectable } from '@nestjs/common';
import {
  computeBasePermissions,
  computeChannelPermissions,
  hasPermission,
  type PermissionChannel,
  type PermissionMember,
  type PermissionOverwriteInput,
  type PermissionServer,
} from '@nezfocus/shared';
import { Clock } from '../../common/clock.js';
import { CHANNEL_TYPES } from '../servers/servers.dto.js';
import {
  OverwriteTargetCode,
  type OverwriteRow,
} from '../servers/servers.schema.js';
import { PermissionCache } from './permission-cache.js';
import {
  PermissionService,
  type PermissionScope,
} from './permission.service.js';
import {
  PermissionsRepository,
  type ChannelFacts,
  type ServerFacts,
} from './permissions.repository.js';

const toOverwrite = (o: OverwriteRow): PermissionOverwriteInput => ({
  targetId: o.targetId.toString(),
  type: o.targetType === OverwriteTargetCode.role ? 'role' : 'member',
  allow: o.allow,
  deny: o.deny,
});

// REQ-ROLE-08: the shared SRS 8.5.2 calculator over the DB, cached per server in Redis.
@Injectable()
export class DbPermissionService extends PermissionService {
  constructor(
    private readonly repo: PermissionsRepository,
    private readonly cache: PermissionCache,
    private readonly clock: Clock,
  ) {
    super();
  }

  async can(userId: bigint, scope: PermissionScope, permission: bigint) {
    return hasPermission(await this.permissionsIn(userId, scope), permission);
  }

  // The whole bitmap; 0 for a non-member, an unknown server, a deleted or DM channel.
  async permissionsIn(userId: bigint, scope: PermissionScope): Promise<bigint> {
    let channel: ChannelFacts | undefined;
    let serverId: bigint;
    if ('channelId' in scope) {
      channel = await this.repo.channel(scope.channelId);
      // ponytail: DM channels have no server; their rule comes with P2-B3.2 (#115).
      if (!channel?.serverId || channel.deletedAt) return 0n;
      serverId = channel.serverId;
    } else serverId = scope.serverId;

    const field = `${userId}:${channel ? `c${channel.id}` : 's'}`;
    const cached = await this.cache.lookup(serverId, field);
    if (cached.bits !== null) return cached.bits;

    const facts = await this.repo.server(serverId, userId);
    if (!facts?.member) return 0n; // not cached: joining counts at once
    const now = this.clock.now();
    const bits = channel
      ? await this.inChannel(serverId, userId, facts, channel, now)
      : computeBasePermissions(
          this.toServer(serverId, facts),
          this.toMember(userId, facts),
          now,
        );
    // A timeout ends by the clock, not by an invalidation.
    const timedOut =
      !!facts.member.timeoutUntil && facts.member.timeoutUntil > now;
    if (!timedOut) await cached.save(bits);
    return bits;
  }

  private async inChannel(
    serverId: bigint,
    userId: bigint,
    facts: ServerFacts,
    channel: ChannelFacts,
    now: Date,
  ) {
    const ids = channel.parentId
      ? [channel.id, channel.parentId]
      : [channel.id];
    const rows = await this.repo.overwrites(ids);
    const overwritesOf = (id: bigint) =>
      rows.filter((o) => o.channelId === id).map(toOverwrite);
    const input: PermissionChannel = {
      type: CHANNEL_TYPES[channel.type]!,
      overwrites: overwritesOf(channel.id),
      permissionsSynced: channel.permissionsSynced,
      parent: channel.parentId
        ? { overwrites: overwritesOf(channel.parentId) }
        : null,
    };
    return computeChannelPermissions(
      this.toServer(serverId, facts),
      this.toMember(userId, facts),
      input,
      now,
    );
  }

  private toServer(serverId: bigint, facts: ServerFacts): PermissionServer {
    return {
      id: serverId.toString(),
      ownerId: facts.ownerId.toString(),
      roles: facts.roles.map((r) => ({ ...r, id: r.id.toString() })),
    };
  }

  private toMember(userId: bigint, facts: ServerFacts): PermissionMember {
    return {
      userId: userId.toString(),
      roleIds: facts.member!.roleIds.map(String),
      timeoutUntil: facts.member!.timeoutUntil,
    };
  }
}
