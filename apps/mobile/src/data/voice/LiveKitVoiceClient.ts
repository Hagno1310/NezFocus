import { AudioSession } from '@livekit/react-native';
import { LogBox } from 'react-native';
import {
  ConnectionQuality,
  DisconnectReason,
  Room,
  RoomEvent,
} from 'livekit-client';
import type {
  VoiceClient,
  VoiceClientEvent,
} from '../../domain/voice/VoiceClient';

// SRS 5.5: the grant has canPublishData false, so LiveKit closes the publisher's data channels
// and livekit-client logs that as an error; the room works.
LogBox.ignoreLogs(['publisher data channel']);

// Closed by the server, not the network: the Gateway brings why (CR-28 #30).
const REMOVED = new Set<DisconnectReason | undefined>([
  DisconnectReason.PARTICIPANT_REMOVED,
  DisconnectReason.DUPLICATE_IDENTITY,
  DisconnectReason.ROOM_DELETED,
]);

// SRS 7.3: the only file that talks to LiveKit. The room is kept for the video views (#140).
export function createLiveKitVoiceClient() {
  const listeners = new Set<(event: VoiceClientEvent) => void>();
  const emit = (event: VoiceClientEvent) => listeners.forEach((l) => l(event));
  let room: Room | null = null;

  const client: VoiceClient & { room(): Room | null } = {
    room: () => room,
    async connect(url, token) {
      // Never two rooms: an old one (a retry after a failed connect) goes first.
      await client.disconnect();
      // REQ-VC-05 AC1: simulcast + adaptive stream + dynacast.
      const next = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: { simulcast: true },
      });
      const poor = new Set<string>();
      next
        .on(RoomEvent.ConnectionQualityChanged, (quality, who) => {
          const was = poor.has(who.identity);
          if (quality === ConnectionQuality.Poor) poor.add(who.identity);
          else poor.delete(who.identity);
          if (was !== poor.has(who.identity))
            emit({ type: 'quality', poor: [...poor] });
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) =>
          emit({ type: 'speakers', userIds: speakers.map((p) => p.identity) }),
        )
        .on(RoomEvent.Reconnecting, () =>
          emit({ type: 'link', state: 'reconnecting' }),
        )
        .on(RoomEvent.Reconnected, () =>
          emit({ type: 'link', state: 'connected' }),
        )
        .on(RoomEvent.Disconnected, (reason) => {
          // Our own disconnect() has already let go of the room.
          if (room !== next) return;
          room = null;
          void AudioSession.stopAudioSession();
          emit({ type: 'ended', removed: REMOVED.has(reason) });
        });
      room = next;
      await AudioSession.startAudioSession();
      try {
        await next.connect(url, token);
      } catch (err) {
        if (room === next) room = null;
        await AudioSession.stopAudioSession();
        throw err;
      }
    },
    async disconnect() {
      const current = room;
      room = null;
      if (!current) return;
      await current.disconnect();
      await AudioSession.stopAudioSession();
    },
    async setMic(on) {
      await room?.localParticipant.setMicrophoneEnabled(on);
    },
    async setCamera(on) {
      await room?.localParticipant.setCameraEnabled(on);
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return client;
}
