import { Injectable } from '@nestjs/common';
import { Permission, parseMentions } from '@nezfocus/shared';
import { PresenceReader } from '../gateway/presence.service.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import type { ChannelRow } from '../servers/servers.schema.js';
import { MessagesRepository } from './messages.repository.js';
import {
  allowedMentions,
  mentionRecipients,
  type MentionVia,
} from './mentions.js';

const MAX_BIGINT = 2n ** 63n - 1n;
// A token may carry any 20 digits; only ids Postgres can hold are looked up.
const ids = (list: readonly string[]) =>
  list.map(BigInt).filter((id) => id <= MAX_BIGINT);

export type Resolved = {
  mentionUserIds: bigint[];
  mentionRoleIds: bigint[];
  mentionEveryone: boolean;
};

// REQ-MSG-03: what a message really mentions, and who it concerns.
@Injectable()
export class MentionsService {
  constructor(
    private readonly repo: MessagesRepository,
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly presence: PresenceReader,
  ) {}

  private async viewers(channelId: bigint, userIds: Iterable<bigint>) {
    const out = new Set<bigint>();
    for (const id of new Set(userIds))
      if (
        await this.permissions.can(id, { channelId }, Permission.VIEW_CHANNEL)
      )
        out.add(id);
    return out;
  }

  // Saved on the message: only mentions that work; the rest stays text (AC1).
  async resolve(
    senderId: bigint,
    channel: ChannelRow,
    content: string,
  ): Promise<Resolved> {
    const parsed = parseMentions(content);
    const serverId = channel.serverId!;
    const canMentionEveryone = await this.permissions.can(
      senderId,
      { channelId: channel.id },
      Permission.MENTION_EVERYONE,
    );
    const roles = parsed.mention_role_ids.length
      ? await this.repo.serverRoles(serverId)
      : [];
    const allowed = allowedMentions(parsed, {
      serverId: String(serverId),
      roles: roles.map((r) => ({
        id: String(r.id),
        mentionable: r.isMentionable,
      })),
      canMentionEveryone,
    });
    // The person mentioned has to see the channel.
    const users = await this.viewers(
      channel.id,
      await this.repo.memberIds(serverId, ids(parsed.mention_user_ids)),
    );
    return {
      mentionUserIds: [...users],
      mentionRoleIds: allowed.roleIds.map(BigInt),
      mentionEveryone: allowed.everyone,
    };
  }

  // CR-12: the people a message concerns, one way each. @here (chốt 22/11/2026): the
  // members not offline right now.
  async recipients(
    senderId: bigint,
    channel: ChannelRow,
    content: string,
    found: Resolved,
  ): Promise<Map<string, MentionVia>> {
    const serverId = channel.serverId!;
    const roleMembers = await this.repo.roleMembers(
      serverId,
      found.mentionRoleIds,
    );
    const everyone = parseMentions(content).mention_everyone;
    let everyoneIds: bigint[] = [];
    if (found.mentionEveryone) {
      everyoneIds = await this.servers.memberIds(serverId);
      if (!everyone)
        everyoneIds = everyoneIds.filter(
          (id) => this.presence.onlineCount([id]) > 0,
        );
    }
    const seen = await this.viewers(channel.id, [
      ...roleMembers.map((m) => m.userId),
      ...everyoneIds,
    ]);
    return mentionRecipients({
      authorId: String(senderId),
      userIds: found.mentionUserIds.map(String),
      roleMembers: roleMembers
        .filter((m) => seen.has(m.userId))
        .map((m) => ({ roleId: String(m.roleId), userId: String(m.userId) })),
      everyoneIds: everyoneIds.filter((id) => seen.has(id)).map(String),
      everyoneVia: everyone ? 'everyone' : 'here',
    });
  }
}
