import {
  AccountDeletionPreview,
  AccountRoutes,
  CurrentUser,
  SessionInfo,
} from '@nezfocus/shared';
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
  updateProfile: async (body) =>
    CurrentUser.parse(
      await api.request(AccountRoutes.me, { method: 'PATCH', body }),
    ),
  deletionPreview: async () =>
    AccountDeletionPreview.parse(await api.request(AccountRoutes.deletion)),
  deleteAccount: async (password) => {
    await api.request(AccountRoutes.me, {
      method: 'DELETE',
      body: { password },
    });
  },
  cancelDeletion: async () => {
    await api.request(AccountRoutes.deletion, { method: 'DELETE' });
  },
};
