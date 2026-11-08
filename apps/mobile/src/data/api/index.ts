import Constants from 'expo-constants';
import {
  endSession,
  markAccountIncomplete,
  requireUpgrade,
} from '../../domain/session/sessionStore';
import { currentLanguage } from '../../shared/i18n';
import { secureTokenStore } from '../auth/secureTokenStore';
import { createApiClient } from './client';

export { ApiError, type ApiClient, type RequestOptions } from './client';

// ponytail: hand-written fetch client. Switch to openapi-fetch (SRS 7.2) with P4-AB.1 (#184).
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: (...args) => fetch(...args),
  tokens: secureTokenStore,
  clientHeaders: () => ({
    'X-Client-Platform': 'android',
    'X-Client-Version': Constants.expoConfig?.version ?? '0.0.0',
    'Accept-Language': currentLanguage(),
  }),
  onSessionEnded: endSession,
  onAccountIncomplete: markAccountIncomplete,
  onUpgradeRequired: requireUpgrade,
});
