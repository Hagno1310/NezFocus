import { GatewayRoutes } from '@nezfocus/shared';
import Constants from 'expo-constants';
import { endSession, requireUpgrade } from '../../domain/session/sessionStore';
import { api, apiBaseUrl } from '../api';
import { getDeviceInfo } from '../auth/deviceInfo';
import { secureTokenStore } from '../auth/secureTokenStore';
import { isFakeArea, pickRepository } from '../fake';
import { fakeServerRepository } from '../servers/FakeServerRepository';
import { AN, createFakeGatewayClient } from './FakeGatewayClient';
import { createGatewayClient, type GatewaySocket } from './RemoteGatewayClient';

// ponytail: khi the Gateway moves off the API host: add EXPO_PUBLIC_GATEWAY_URL. Same host now
// (SRS 7.1.1, one process).
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
// With `servers` faked too, READY lists the fake servers; otherwise none (S-HOME-02 no-server).
// P1-B4.3: presence of the sample friends (04 › Phòng & bạn bè mẫu) for S-ME-02 and the rows.
const inMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const fake = createFakeGatewayClient(
  [
    { after: 3000, t: 'USER_UPDATE', d: { ...AN, display_name: 'An Nguyễn' } },
    {
      after: 5000,
      t: 'PRESENCE_UPDATE',
      d: {
        user_id: '6', // Minh, learning alone
        status: 'online',
        activity: {
          kind: 'solo',
          phase: 'focus',
          state: 'running',
          phase_ends_at: inMin(32),
        },
      },
    },
    {
      after: 10_000,
      t: 'PRESENCE_UPDATE',
      d: { user_id: '2', status: 'idle', activity: null }, // Bình goes Vắng mặt
    },
    {
      after: 15_000,
      t: 'PRESENCE_UPDATE',
      d: { user_id: '3', status: 'offline', activity: null }, // Chi goes offline
    },
    {
      after: 20_000,
      t: 'PRESENCE_UPDATE',
      d: {
        user_id: '6',
        status: 'online',
        activity: {
          kind: 'solo',
          phase: 'short_break',
          state: 'waiting',
          phase_ends_at: null,
        },
      },
    },
  ],
  () => (isFakeArea('servers') ? fakeServerRepository.summaries() : []),
  [
    { user_id: '2', status: 'online', activity: null },
    { user_id: '3', status: 'dnd', activity: null },
  ],
);

export const gatewayClient = pickRepository('gateway', { remote, fake });
