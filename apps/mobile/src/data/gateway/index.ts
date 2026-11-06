import { GatewayRoutes } from '@nezfocus/shared';
import Constants from 'expo-constants';
import { endSession, requireUpgrade } from '../../domain/session/sessionStore';
import { api, apiBaseUrl } from '../api';
import { getDeviceInfo } from '../auth/deviceInfo';
import { secureTokenStore } from '../auth/secureTokenStore';
import { pickRepository } from '../fake';
import { AN, createFakeGatewayClient } from './FakeGatewayClient';
import { createGatewayClient, type GatewaySocket } from './RemoteGatewayClient';

// ponytail: the Gateway shares the API host (SRS 7.1.1, one process); add EXPO_PUBLIC_GATEWAY_URL if they split.
const gatewayUrl =
  apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') +
  GatewayRoutes.connect;

const remote = createGatewayClient({
  url: gatewayUrl,
  createSocket: (url) => {
    const ws = new WebSocket(url);
    const socket: GatewaySocket = {
      send: (text) => ws.send(text),
      close: (code, reason) => ws.close(code, reason),
      onmessage: null,
      onclose: null,
    };
    ws.onmessage = (e) => socket.onmessage?.({ data: String(e.data) });
    ws.onclose = (e) => socket.onclose?.({ code: e.code, reason: e.reason });
    return socket;
  },
  getToken: async () => (await secureTokenStore.get())?.access_token ?? null,
  refreshToken: () => api.refresh(),
  device: async () => ({
    platform: 'android',
    app_version: Constants.expoConfig?.version ?? '0.0.0',
    device_id: (await getDeviceInfo()).id,
  }),
  random: Math.random,
  onSessionEnded: endSession,
  onUpgradeRequired: requireUpgrade,
});

// EXPO_PUBLIC_FAKE=gateway: what plays after READY. Each area adds steps for its own events here.
const fake = createFakeGatewayClient([
  { after: 3000, t: 'USER_UPDATE', d: { ...AN, display_name: 'An Nguyễn' } },
]);

export const gatewayClient = pickRepository('gateway', { remote, fake });
