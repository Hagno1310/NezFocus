import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  addedAllows,
  canEditOverwrite,
  type ChannelResponse,
  type OverwriteTarget,
  type PermissionOverwrite,
  type PermissionServer,
  type PutChannelPermissionRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ChannelEvents } from './channel-events.js';
import {
  ChannelsRepository,
  type LockedChannels,
  type People,
} from './channels.repository.js';
import { ChannelsService } from './channels.service.js';
import { toChannelResponse } from './servers.dto.js';

const invalid = (field: string, code: string, message: string) =>
  new AppError(ErrorCode.ValidationError, message, {
    [field]: [{ code, message }],
  });
const outranked = () =>
  new AppError(
    ErrorCode.InsufficientRoleHierarchy,
    'The target is level with or above your highest role',
  );

const toServer = (serverId: bigint, people: People): PermissionServer => ({
  id: serverId.toString(),
  ownerId: people.ownerId.toString(),
  roles: people.roles.map((r) => ({ ...r, id: r.id.toString() })),
});
const toMember = (people: People, userId: bigint) => ({
  userId: userId.toString(),
  roleIds: (people.roleIdsOf.get(userId) ?? []).map(String),
});

// REQ-ROLE-03: one role's or member's allow / deny in a channel or category. The caller
// needs MANAGE_CHANNELS there (SRS 8.5.1), edits only targets below them and only allows
// bits they hold in the channel (8.5.2).
@Injectable()
export class ChannelOverwritesService {
  constructor(
    private readonly channels: ChannelsService,
    private readonly repo: ChannelsRepository,
    private readonly permissions: PermissionService,
    private readonly cache: PermissionCache,
    private readonly channelEvents: ChannelEvents,
  ) {}

  async put(
    userId: bigint,
    channelId: bigint,
    targetId: bigint,
    body: PutChannelPermissionRequest,
  ): Promise<PermissionOverwrite> {
    const next: PermissionOverwrite = {
      target_id: targetId.toString(),
      ...body,
    };
    const channel = await this.write(
      userId,
      channelId,
      async (locked, self) => {
        const people = await locked.people(self.serverId, [userId, targetId]);
        const target = this.target(people, next);
        if (!target)
          throw invalid(
            'target_id',
            'UNKNOWN_TARGET',
            'Not a role or a member of this server',
          );
        this.checkRank(self.serverId, people, userId, target);
        const before = self.channel.permission_overwrites.find(
          (o) =>
            o.target_id === next.target_id &&
            o.target_type === next.target_type,
        );
        await this.permissions.require(
          userId,
          { channelId },
          addedAllows(before, next),
        );
        await locked.putOverwrite(channelId, next);
      },
    );
    return channel.permission_overwrites.find(
      (o) =>
        o.target_id === next.target_id && o.target_type === next.target_type,
    )!;
  }

  // 204 also when there is nothing to drop.
  async remove(userId: bigint, channelId: bigint, targetId: bigint) {
    await this.write(userId, channelId, async (locked, self) => {
      const existing = self.channel.permission_overwrites.find(
        (o) => o.target_id === targetId.toString(),
      );
      if (!existing) return;
      const people = await locked.people(self.serverId, [userId, targetId]);
      // A role deleted meanwhile, or a member who left, outranks nobody.
      const target = this.target(people, existing) ?? {
        type: 'member' as const,
        member: { userId: existing.target_id, roleIds: [] },
      };
      this.checkRank(self.serverId, people, userId, target);
      await locked.deleteOverwrite(channelId, targetId);
    });
  }

  // The checks and the change under the server lock, then the cache and CHANNEL_UPDATE.
  private async write(
    userId: bigint,
    channelId: bigint,
    change: (
      locked: LockedChannels,
      self: { serverId: bigint; channel: ChannelResponse },
    ) => Promise<void>,
  ): Promise<ChannelResponse> {
    const row = await this.channels.manageable(userId, channelId);
    const serverId = row.serverId!;
    const channels = await this.repo.locked(serverId, async (locked) => {
      const current = locked.rows.find((c) => c.id === channelId);
      if (!current) throw new AppError(ErrorCode.NotFound, 'Unknown channel'); // deleted meanwhile
      const self = toChannelResponse(current);
      // v1.7: a synced channel uses its category's overwrites, not its own.
      if (self.type !== 'category' && self.permissions_synced)
        throw invalid(
          '_',
          'SYNCED',
          'The channel follows its category; turn syncing off first',
        );
      await change(locked, { serverId, channel: self });
      // A category's synced channels change who sees them too, so they go out again.
      const followers = locked.rows
        .filter((c) => c.parentId === channelId && c.permissionsSynced)
        .map(toChannelResponse);
      return [
        toChannelResponse((await locked.reload(channelId))!),
        ...followers,
      ];
    });
    await this.cache.invalidateServer(serverId);
    await this.channelEvents.updated(serverId, channels);
    return channels[0]!;
  }

  // undefined: no such role in this server, or the user is not a member.
  private target(
    people: People,
    o: Pick<PermissionOverwrite, 'target_id' | 'target_type'>,
  ): OverwriteTarget | undefined {
    const id = BigInt(o.target_id);
    if (o.target_type === 'role') {
      const role = people.roles.find((r) => r.id === id);
      return role && { type: 'role', role: { ...role, id: o.target_id } };
    }
    if (!people.roleIdsOf.has(id)) return undefined;
    return { type: 'member', member: toMember(people, id) };
  }

  private checkRank(
    serverId: bigint,
    people: People,
    userId: bigint,
    target: OverwriteTarget,
  ) {
    if (
      !canEditOverwrite(
        toServer(serverId, people),
        toMember(people, userId),
        target,
      )
    )
      throw outranked();
  }
}
