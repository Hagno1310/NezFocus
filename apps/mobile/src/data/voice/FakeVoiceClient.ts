import type {
  VoiceClient,
  VoiceClientEvent,
} from '../../domain/voice/VoiceClient';

// Tests and EXPO_PUBLIC_FAKE=voice: no media; `emit` plays what LiveKit would report.
export function createFakeVoiceClient(
  opts: { micAllowed?: () => boolean } = {},
) {
  const listeners = new Set<(event: VoiceClientEvent) => void>();
  const state = {
    room: null as string | null, // the token it connected with
    mic: false,
    camera: false,
    log: [] as string[],
  };
  const client: VoiceClient & {
    state: typeof state;
    emit(event: VoiceClientEvent): void;
  } = {
    state,
    async connect(_url, token) {
      state.log.push(`connect ${token}`);
      state.room = token;
      listeners.forEach((l) => l({ type: 'link', state: 'connected' }));
    },
    async disconnect() {
      if (!state.room) return;
      state.log.push('disconnect');
      state.room = null;
      state.mic = state.camera = false;
    },
    async setMic(on) {
      if (on && opts.micAllowed && !opts.micAllowed())
        throw new Error('mic refused');
      state.log.push(`mic ${on}`);
      state.mic = on;
    },
    async setCamera(on) {
      state.log.push(`camera ${on}`);
      state.camera = on;
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(event) {
      listeners.forEach((l) => l(event));
    },
  };
  return client;
}
