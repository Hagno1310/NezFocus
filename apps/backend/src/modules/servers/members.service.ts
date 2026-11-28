import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  Permission,
  canActOnMember,
  canManageRole,
  compareMembers,
  matchesMember,
  pageMembers,
  type MemberListQuery,
  type MemberListResponse,
  type ServerMember,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { avatarUrls } from '../attachments/media.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { PermissionService } from '../permissions/permission.service.js';
import { AuditLogService } from '../safety/audit-log.service.js';
import { ChannelEvents } from './channel-events.js';
import { ChannelsRepository } from './channels.repository.js';
import { MembersRepository, type MemberRow } from './members.repository.js';
import { RolesRepository } from './roles.repository.js';
import { actorOf } from './roles.service.js';
import { toChannelResponse } from './servers.dto.js';
import { ServersRepository } from './servers.repository.js';

const notFound = (what: string) => new AppError(ErrorCode.NotFound, what);
const outranked = (message: string) =>
  new AppError(ErrorCode.InsufficientRoleHierarchy, message);

export const toServerMember = (m: MemberRow): ServerMember => ({
  user: {
    id: m.userId.toString(),
    username: m.username,
    display_name: m.displayName,
    avatar: avatarUrls(m.avatarKey),
  },
  role_ids: m.roleIds,
  joined_at: m.joinedAt.toISOString(),
  timeout_until: m.timeoutUntil?.toISOString() ?? null,
  timeout_reason: m.timeoutReason,
});

// REQ-ROLE-04: the member list (S-SET-03, S-HOME-03) and giving / taking one role (CR-28 #23).
@Injectable()
export class MembersService {
  constructor(
    private readonly repo: MembersRepository,
    private readonly roles: RolesRepository,
    private readonly servers: ServersRepository,
    private readonly channels: ChannelsRepository,
    private readonly permissions: PermissionService,
    private readonly cache: PermissionCache,
    private readonly events: EventPublisher,
    private readonly channelEvents: ChannelEvents,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    userId: bigint,
    serverId: bigint,
    query: MemberListQuery,
  ): Promise<MemberListResponse> {
    await this.memberOf(serverId, userId);
    let rows = (await this.repo.list(serverId)).map(toServerMember);
    if (query.channel_id) {
      const channelId = BigInt(query.channel_id);
      const channel = await this.servers.findChannel(channelId);
      const scope = { channelId };
      if (
        channel?.serverId !== serverId ||
        !(await this.permissions.can(userId, scope, Permission.VIEW_CHANNEL))
      )
        throw notFound('Unknown channel');
      // ponytail: khi server > 1000 thành viên: tính quyền kênh từ một lần đọc role và overwrite, không hỏi từng người.
      const sees = await Promise.all(
        rows.map((m) =>
          this.permissions.can(
            BigInt(m.user.id),
            scope,
            Permission.VIEW_CHANNEL,
          ),
        ),
      );
      rows = rows.filter((_, i) => sees[i]);
    }
    const shown = rows
      .filter((m) => matchesMember(m, query.q ?? ''))
      .sort(compareMembers);
    return pageMembers(shown, query.after, query.limit);
  }

  // REQ-ROLE-04 AC1/AC2. `give` false takes the role away. Nothing changed → no event.
  async setRole(
    userId: bigint,
    serverId: bigint,
    targetId: bigint,
    roleId: bigint,
    give: boolean,
  ): Promise<void> {
    await this.memberOf(serverId, userId);
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_ROLES,
    );
    if (roleId === serverId)
      throw new AppError(
        ErrorCode.ValidationError,
        '@everyone cannot be given or taken',
        {
          role_id: [{ code: 'EVERYONE', message: 'Everyone has @everyone' }],
        },
      );
    const changed = await this.roles.locked(
      serverId,
      userId,
      async (locked) => {
        const role = locked.rows.find((r) => r.id === roleId);
        if (!role) throw notFound('Unknown role');
        const targetRoles = await locked.memberRoleIds(targetId);
        if (!targetRoles) throw notFound('Unknown member');
        const actor = actorOf(serverId, userId, locked);
        const asRole = {
          id: role.id.toString(),
          permissions: role.permissions,
          position: role.position,
        };
        if (!canManageRole(actor.server, actor.member, asRole))
          throw outranked('The role is level with or above your highest role');
        // CR-28 #24: on oneself only the role counts.
        const target = {
          userId: targetId.toString(),
          roleIds: targetRoles.map(String),
        };
        if (
          targetId !== userId &&
          !canActOnMember(actor.server, actor.member, target)
        )
          throw outranked('The member is the Owner or level with or above you');
        return give
          ? locked.giveRole(targetId, roleId)
          : locked.takeRole(targetId, roleId);
      },
    );
    if (!changed) return;
    // ROLE-08 AC3: the next request of the member computes again.
    await this.cache.invalidateServer(serverId);
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId,
      action: 'MEMBER_ROLE_UPDATE',
      changes: give
        ? { after: { added: [roleId.toString()] } }
        : { after: { removed: [roleId.toString()] } },
    });
    const member = await this.repo.one(serverId, targetId);
    if (member)
      await this.events.toServer(serverId, 'SERVER_MEMBER_UPDATE', {
        server_id: serverId.toString(),
        ...toServerMember(member),
      });
    // Channels they gained or lost (CHANNEL_UPDATE / CHANNEL_DELETE), only to them.
    const channels = await this.channels.listForServer(serverId);
    await this.channelEvents.updated(
      serverId,
      channels.map(toChannelResponse),
      { only: [targetId] },
    );
  }

  // 40401 for a server that does not exist and for one the caller is not in.
  private async memberOf(serverId: bigint, userId: bigint) {
    if (!(await this.servers.isMember(serverId, userId)))
      throw notFound('Unknown server');
  }
}
