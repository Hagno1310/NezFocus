import {
  AuthRoutes,
  CurrentUser,
  EmailCodeSentResponse,
  EmailSignInResponse,
  SessionResponse,
  UsernameAvailableResponse,
} from '@nezfocus/shared';
import type { AuthRepository } from '../../domain/auth/AuthRepository';
import { api } from '../api';
import { getDeviceInfo } from './deviceInfo';
import { secureTokenStore } from './secureTokenStore';

const keep = async <T extends { access_token: string; refresh_token: string }>(
  session: T,
) => {
  await secureTokenStore.set({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return session;
};

export const remoteAuthRepository: AuthRepository = {
  sendEmailCode: async (email) =>
    EmailCodeSentResponse.parse(
      await api.request(AuthRoutes.sendEmailCode, {
        method: 'POST',
        auth: false,
        body: { email, device: await getDeviceInfo() },
      }),
    ),
  verifyEmailCode: async (email, code) =>
    keep(
      EmailSignInResponse.parse(
        await api.request(AuthRoutes.verifyEmailCode, {
          method: 'POST',
          auth: false,
          body: { email, code, device: await getDeviceInfo() },
        }),
      ),
    ),
  login: async (email, password) =>
    keep(
      SessionResponse.parse(
        await api.request(AuthRoutes.login, {
          method: 'POST',
          auth: false,
          body: { email, password, device: await getDeviceInfo() },
        }),
      ),
    ),
  usernameAvailable: async (username) =>
    UsernameAvailableResponse.parse(
      await api.request(
        `${AuthRoutes.usernameAvailable}?username=${encodeURIComponent(username)}`,
      ),
    ).available,
  completeAccount: async (body) =>
    CurrentUser.parse(
      await api.request(AuthRoutes.completeAccount, { method: 'POST', body }),
    ),
  logout: async () => {
    try {
      await api.request(AuthRoutes.logout, { method: 'POST' });
    } finally {
      await secureTokenStore.clear();
    }
  },
};
