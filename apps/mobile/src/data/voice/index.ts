import {
  MemberRoutes,
  VoiceRoutes,
  VoiceTokenResponse,
  type UpdateMemberVoiceRequest,
} from '@nezfocus/shared';
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

// REQ-VC-04 (CR-28 #31): mod-mute / disconnect someone (S-HOME-10 `moderator-voice`).
export const moderateVoice = async (
  serverId: string,
  userId: string,
  body: UpdateMemberVoiceRequest,
) => {
  await api.request(
    MemberRoutes.voice.replace(':id', serverId).replace(':userId', userId),
    { method: 'PATCH', body },
  );
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
