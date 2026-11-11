import { AccountRoutes, CurrentUser, SessionInfo } from '@nezfocus/shared';
import type { AccountRepository } from '../../domain/account/AccountRepository';
import { api } from '../api';

export const remoteAccountRepository: AccountRepository = {
  me: async () => CurrentUser.parse(await api.request(AccountRoutes.me)),
  changePassword: async (body) => {
    await api.request(AccountRoutes.changePassword, { method: 'POST', body });
  },
  sessions: async () =>
    SessionInfo.array().parse(await api.request(AccountRoutes.sessions)),
  revokeSession: async (id) => {
    await api.request(AccountRoutes.session.replace(':id', id), {
      method: 'DELETE',
    });
  },
  revokeOtherSessions: async () => {
    await api.request(AccountRoutes.sessions, { method: 'DELETE' });
  },
};
