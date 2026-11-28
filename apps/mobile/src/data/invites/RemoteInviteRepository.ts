import {
  InvitePreview,
  InviteResponse,
  InviteRoutes,
  ServerInviteList,
  ServerResponse,
} from '@nezfocus/shared';
import type { InviteRepository } from '../../domain/invites/InviteRepository';
import { api } from '../api';

const byCode = (code: string) => InviteRoutes.byCode.replace(':code', code);

export const remoteInviteRepository: InviteRepository = {
  createInvite: async (channelId, body) =>
    InviteResponse.parse(
      await api.request(InviteRoutes.create.replace(':id', channelId), {
        method: 'POST',
        body,
      }),
    ),
  revokeInvite: async (code) => {
    await api.request(byCode(code), { method: 'DELETE' });
  },
  listInvites: async (serverId) =>
    ServerInviteList.parse(
      await api.request(InviteRoutes.forServer.replace(':id', serverId)),
    ),
  previewInvite: async (code) =>
    InvitePreview.parse(await api.request(byCode(code), { auth: false })),
  acceptInvite: async (code) =>
    ServerResponse.parse(
      await api.request(InviteRoutes.accept.replace(':code', code), {
        method: 'POST',
      }),
    ),
};
