import { Injectable } from '@nestjs/common';
import { Permission, type ChannelResponse } from '@nezfocus/shared';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from './servers.repository.js';

// CHANNEL_CREATE / CHANNEL_UPDATE go member by member: a channel reaches only the people who
// can VIEW_CHANNEL it (REQ-SRV-02 AC10, ROLE-03 AC3). After an update the others get
// CHANNEL_DELETE, so a channel someone just lost leaves their list (02 `channel-removed`).
// Call after PermissionCache.invalidateServer, so the check sees the new overwrites.
// ponytail: one permission lookup per member and channel, and a role's own bits changing
// (SERVER_ROLE_UPDATE, member roles) sends no channel again; the Gateway's own recipient
// filter, P2-B1 (#18), replaces both.
@Injectable()
export class ChannelEvents {
  constructor(
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
  ) {}

  async created(serverId: bigint, channel: ChannelResponse) {
    for (const userId of await this.servers.memberIds(serverId))
      if (await this.sees(userId, channel))
        await this.events.toUser(userId, 'CHANNEL_CREATE', channel);
  }

  async updated(serverId: bigint, channels: readonly ChannelResponse[]) {
    if (!channels.length) return;
    const members = await this.servers.memberIds(serverId);
    for (const channel of channels)
      for (const userId of members)
        if (await this.sees(userId, channel))
          await this.events.toUser(userId, 'CHANNEL_UPDATE', channel);
        else
          await this.events.toUser(userId, 'CHANNEL_DELETE', {
            id: channel.id,
            server_id: channel.server_id,
          });
  }

  private sees(userId: bigint, channel: ChannelResponse) {
    return this.permissions.can(
      userId,
      { channelId: BigInt(channel.id) },
      Permission.VIEW_CHANNEL,
    );
  }
}
