import {
  BanListResponse,
  BanRoutes,
  ChannelResponse,
  ChannelRoutes,
  MEMBER_PAGE_MAX,
  MemberListResponse,
  MemberRoutes,
  PermissionOverwrite,
  RoleListResponse,
  RoleResponse,
  RoleRoutes,
  ServerResponse,
  ServerRoutes,
  ServerSummary,
  ServerMember,
} from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { api } from '../api';

const permission = (channelId: string, targetId: string) =>
  ChannelRoutes.permission
    .replace(':id', channelId)
    .replace(':targetId', targetId);

const member = (serverId: string, userId: string) =>
  MemberRoutes.member.replace(':id', serverId).replace(':userId', userId);

const ban = (serverId: string, userId: string) =>
  BanRoutes.one.replace(':id', serverId).replace(':userId', userId);

const role = (serverId: string, roleId: string) =>
  RoleRoutes.byId.replace(':id', serverId).replace(':roleId', roleId);

export const remoteServerRepository: ServerRepository = {
  createServer: async (body) =>
    ServerResponse.parse(
      await api.request(ServerRoutes.create, { method: 'POST', body }),
    ),
  getServer: async (id) =>
    ServerResponse.parse(
      await api.request(ServerRoutes.byId.replace(':id', id)),
    ),
  updateServer: async (id, body) =>
    ServerSummary.parse(
      await api.request(ServerRoutes.byId.replace(':id', id), {
        method: 'PATCH',
        body,
      }),
    ),
  createChannel: async (serverId, body) =>
    ChannelResponse.parse(
      await api.request(ChannelRoutes.list.replace(':id', serverId), {
        method: 'POST',
        body,
      }),
    ),
  updateChannel: async (id, body) =>
    ChannelResponse.parse(
      await api.request(ChannelRoutes.byId.replace(':id', id), {
        method: 'PATCH',
        body,
      }),
    ),
  deleteChannel: async (id) => {
    await api.request(ChannelRoutes.byId.replace(':id', id), {
      method: 'DELETE',
    });
  },
  setChannelPositions: async (serverId, body) => {
    await api.request(ChannelRoutes.positions.replace(':id', serverId), {
      method: 'PATCH',
      body,
    });
  },
  listRoles: async (serverId) =>
    RoleListResponse.parse(
      await api.request(RoleRoutes.list.replace(':id', serverId)),
    ),
  createRole: async (serverId, body) =>
    RoleResponse.parse(
      await api.request(RoleRoutes.list.replace(':id', serverId), {
        method: 'POST',
        body,
      }),
    ),
  updateRole: async (serverId, roleId, body) =>
    RoleResponse.parse(
      await api.request(role(serverId, roleId), { method: 'PATCH', body }),
    ),
  deleteRole: async (serverId, roleId) => {
    await api.request(role(serverId, roleId), { method: 'DELETE' });
  },
  setRolePositions: async (serverId, body) => {
    await api.request(RoleRoutes.positions.replace(':id', serverId), {
      method: 'PATCH',
      body,
    });
  },
  setChannelPermission: async (channelId, targetId, body) =>
    PermissionOverwrite.parse(
      await api.request(permission(channelId, targetId), {
        method: 'PUT',
        body,
      }),
    ),
  deleteChannelPermission: async (channelId, targetId) => {
    await api.request(permission(channelId, targetId), { method: 'DELETE' });
  },
  // ponytail: khi server > 1000 thành viên: tải theo trang khi cuộn thay vì tải hết một lần.
  listMembers: async (serverId, channelId) => {
    const all: ServerMember[] = [];
    let after: string | null = null;
    do {
      const params = new URLSearchParams({ limit: String(MEMBER_PAGE_MAX) });
      if (channelId) params.set('channel_id', channelId);
      if (after) params.set('after', after);
      const page = MemberListResponse.parse(
        await api.request(
          `${MemberRoutes.list.replace(':id', serverId)}?${params}`,
        ),
      );
      all.push(...page.members);
      after = page.next_cursor;
    } while (after);
    return all;
  },
  setMemberRole: async (serverId, userId, roleId, give) => {
    await api.request(
      MemberRoutes.role
        .replace(':id', serverId)
        .replace(':userId', userId)
        .replace(':roleId', roleId),
      { method: give ? 'PUT' : 'DELETE' },
    );
  },
  timeoutMember: async (serverId, userId, until, reason) =>
    ServerMember.parse(
      await api.request(member(serverId, userId), {
        method: 'PATCH',
        body: { timeout_until: until, reason },
      }),
    ),
  kickMember: async (serverId, userId, reason) => {
    await api.request(member(serverId, userId), {
      method: 'DELETE',
      body: { reason },
    });
  },
  banMember: async (serverId, userId, body) => {
    await api.request(ban(serverId, userId), { method: 'PUT', body });
  },
  listBans: async (serverId, { q, after }) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (after) params.set('after', after);
    return BanListResponse.parse(
      await api.request(`${BanRoutes.list.replace(':id', serverId)}?${params}`),
    );
  },
  unbanMember: async (serverId, userId) => {
    await api.request(ban(serverId, userId), { method: 'DELETE' });
  },
};
