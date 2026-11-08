import { ServerResponse, ServerRoutes } from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { api } from '../api';

export const remoteServerRepository: ServerRepository = {
  createServer: async (body) =>
    ServerResponse.parse(
      await api.request(ServerRoutes.create, { method: 'POST', body }),
    ),
};
