import type { VoiceTokenResponse } from '@nezfocus/shared';

// SRS 7.3: LiveKit lives in src/data behind this; screens read voiceStore.
export type VoiceLink = 'connecting' | 'connected' | 'reconnecting';

export type VoiceClientEvent =
  | { type: 'link'; state: VoiceLink }
  // The room closed by itself. `removed`: the server took us out (kick, other device, channel
  // deleted…) and the Gateway brings the reason; otherwise the network gave up.
  | { type: 'ended'; removed: boolean }
  | { type: 'speakers'; userIds: string[] } // LiveKit active speakers (REQ-VC-02)
  | { type: 'quality'; poor: string[] }; // LiveKit quality `poor` (REQ-VC-05, C-07)

export interface VoiceClient {
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  setMic(on: boolean): Promise<void>; // rejects when Android refuses the mic
  setCamera(on: boolean): Promise<void>;
  onEvent(listener: (event: VoiceClientEvent) => void): () => void;
}

export interface VoiceRepository {
  token(channelId: string): Promise<VoiceTokenResponse>; // POST VoiceRoutes.token
}
