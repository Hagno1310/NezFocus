import {
  ChannelResponse,
  ChannelRoutes,
  PermissionOverwrite,
  RoleListResponse,
  RoleResponse,
  RoleRoutes,
  ServerResponse,
  ServerRoutes,
  ServerSummary,
} from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { api } from '../api';

const permission = (channelId: string, targetId: string) =>
  ChannelRoutes.permission
    .replace(':id', channelId)
    .replace(':targetId', targetId);

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
};
