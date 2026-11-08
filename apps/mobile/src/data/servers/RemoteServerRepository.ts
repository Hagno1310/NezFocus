import { ServerResponse, ServerRoutes, ServerSummary } from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { api } from '../api';

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
};
