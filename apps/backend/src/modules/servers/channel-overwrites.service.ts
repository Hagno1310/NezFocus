import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  addedAllows,
  type ChannelResponse,
  type PermissionOverwrite,
  type PutChannelPermissionRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ChannelEvents } from './channel-events.js';
import {
  ChannelsRepository,
  type LockedChannels,
} from './channels.repository.js';
import { ChannelsService } from './channels.service.js';
import { assertCanEditTarget, overwriteTarget } from './overwrite-targets.js';
import { toChannelResponse } from './servers.dto.js';

const invalid = (field: string, code: string, message: string) =>
  new AppError(ErrorCode.ValidationError, message, {
    [field]: [{ code, message }],
  });

const sameTarget =
  (a: Pick<PermissionOverwrite, 'target_id' | 'target_type'>) =>
  (b: Pick<PermissionOverwrite, 'target_id' | 'target_type'>) =>
    a.target_id === b.target_id && a.target_type === b.target_type;

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
        if (!overwriteTarget(people, next))
          throw invalid(
            'target_id',
            'UNKNOWN_TARGET',
            'Not a role or a member of this server',
          );
        assertCanEditTarget(self.serverId, people, userId, next);
        const before = self.channel.permission_overwrites.find(
          sameTarget(next),
        );
        await this.permissions.require(
          userId,
          { channelId },
          addedAllows(before, next),
        );
        await locked.putOverwrite(channelId, next);
        return true;
      },
    );
    return channel.permission_overwrites.find(sameTarget(next))!;
  }

  // 204 also when there is nothing to drop; then nothing is invalidated or sent.
  async remove(userId: bigint, channelId: bigint, targetId: bigint) {
    await this.write(userId, channelId, async (locked, self) => {
      const existing = self.channel.permission_overwrites.find(
        (o) => o.target_id === targetId.toString(),
      );
      if (!existing) return false;
      const people = await locked.people(self.serverId, [userId, targetId]);
      assertCanEditTarget(self.serverId, people, userId, existing);
      await locked.deleteOverwrite(channelId, targetId);
      return true;
    });
  }

  // The checks and the change under the server lock, then the cache and CHANNEL_UPDATE.
  private async write(
    userId: bigint,
    channelId: bigint,
    change: (
      locked: LockedChannels,
      self: { serverId: bigint; channel: ChannelResponse },
    ) => Promise<boolean>, // false: nothing changed
  ): Promise<ChannelResponse> {
    const row = await this.channels.manageable(userId, channelId);
    const serverId = row.serverId!;
    const result = await this.repo.locked(serverId, async (locked) => {
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
      if (!(await change(locked, { serverId, channel: self })))
        return { changed: false, channels: [self] };
      // A category's synced channels change who sees them too, so they go out again.
      const followers = locked.rows
        .filter((c) => c.parentId === channelId && c.permissionsSynced)
        .map(toChannelResponse);
      return {
        changed: true,
        channels: [
          toChannelResponse((await locked.reload(channelId))!),
          ...followers,
        ],
      };
    });
    if (result.changed) {
      await this.cache.invalidateServer(serverId);
      await this.channelEvents.updated(serverId, result.channels);
    }
    return result.channels[0]!;
  }
}
