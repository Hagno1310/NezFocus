import { Injectable } from '@nestjs/common';
import { Permission, type ChannelResponse } from '@nezfocus/shared';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from './servers.repository.js';

// CHANNEL_CREATE / CHANNEL_UPDATE go member by member: a channel reaches only the people who
// can VIEW_CHANNEL it (REQ-SRV-02 AC10, ROLE-03 AC3). After an update the others get
// CHANNEL_DELETE, so a channel someone just lost leaves their list (02 `channel-removed`).
// Call after PermissionCache.invalidateServer, so the check sees the new overwrites.
// A role given / taken (MembersService) or a role's bits changing (RolesService) sends them again.
@Injectable()
export class ChannelEvents {
  constructor(
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
  ) {}

  created(channel: ChannelResponse) {
    return this.events.toChannel(BigInt(channel.id), 'CHANNEL_CREATE', channel);
  }

  // `only`: the members whose view changed (a role given or taken); default everyone.
  // `by`: who changed the channel itself (CR-28 #37 updated_by); none when it only moved.
  async updated(
    serverId: bigint,
    channels: readonly ChannelResponse[],
    { only, by }: { only?: readonly bigint[]; by?: bigint } = {},
  ) {
    if (!channels.length) return;
    const members = only ?? (await this.servers.memberIds(serverId));
    const updated_by = by?.toString() ?? null;
    for (const channel of channels)
      for (const userId of members)
        if (await this.sees(userId, channel))
          await this.events.toUser(userId, 'CHANNEL_UPDATE', {
            ...channel,
            updated_by,
          });
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
