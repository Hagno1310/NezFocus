import { VoiceRoutes, VoiceTokenResponse } from '@nezfocus/shared';
import type {
  VoiceClient,
  VoiceRepository,
} from '../../domain/voice/VoiceClient';
import { createVoiceSession } from '../../domain/voice/voiceSession';
import { sessionStore } from '../../domain/session/sessionStore';
import { api } from '../api';
import { pickRepository } from '../fake';
import { gatewayClient } from '../gateway';
import { createFakeVoiceClient } from './FakeVoiceClient';
import { createLiveKitVoiceClient } from './LiveKitVoiceClient';

const remoteRepo: VoiceRepository = {
  token: async (channelId) =>
    VoiceTokenResponse.parse(
      await api.request(VoiceRoutes.token, {
        method: 'POST',
        body: { channel_id: channelId },
      }),
    ),
};

// EXPO_PUBLIC_FAKE=voice: joins without LiveKit (no sound), to look at the room screens.
const fakeRepo: VoiceRepository = {
  token: async (channelId) => ({
    token: `fake-${channelId}`,
    url: 'ws://fake',
  }),
};

export const liveKitClient = createLiveKitVoiceClient();

export const voiceSession = createVoiceSession({
  repo: pickRepository('voice', { remote: remoteRepo, fake: fakeRepo }),
  client: pickRepository<VoiceClient>('voice', {
    remote: liveKitClient,
    fake: createFakeVoiceClient(),
  }),
  gateway: gatewayClient,
  me: () => sessionStore.getState().user?.id ?? null,
});
