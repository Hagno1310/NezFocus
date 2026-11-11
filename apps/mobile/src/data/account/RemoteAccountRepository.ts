import { AccountRoutes, CurrentUser } from '@nezfocus/shared';
import type { AccountRepository } from '../../domain/account/AccountRepository';
import { api } from '../api';

export const remoteAccountRepository: AccountRepository = {
  me: async () => CurrentUser.parse(await api.request(AccountRoutes.me)),
};
