import { VideoView } from '@livekit/react-native';
import {
  RoomEvent,
  Track,
  createLocalVideoTrack,
  type LocalVideoTrack,
  type VideoTrack,
} from 'livekit-client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useStore } from 'zustand';
import { voiceStore } from '../../domain/voice/voiceSession';
import { liveKitClient } from '.';

const TRACK_EVENTS = [
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
] as const;

function cameraOf(userId: string): VideoTrack | undefined {
  const room = liveKitClient.room();
  if (!room) return undefined;
  const who =
    room.localParticipant.identity === userId
      ? room.localParticipant
      : room.remoteParticipants.get(userId);
  const pub = who?.getTrackPublication(Track.Source.Camera);
  return pub && !pub.isMuted ? pub.videoTrack : undefined;
}

// C-07 `video`: someone's camera in the room (mine mirrored), or nothing → the avatar shows.
export function ParticipantVideo({
  userId,
  mirror = false,
}: {
  userId: string;
  mirror?: boolean;
}) {
  // A new LiveKit room after a reconnect: listen to that one.
  const link = useStore(voiceStore, (s) => s.call?.link);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const room = liveKitClient.room();
      TRACK_EVENTS.forEach((e) => room?.on(e, onChange));
      return () => TRACK_EVENTS.forEach((e) => room?.off(e, onChange));
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `link` picks the current room
    [link],
  );
  const track = useSyncExternalStore(subscribe, () => cameraOf(userId));
  if (!track) return null;
  return (
    <VideoView
      videoTrack={track}
      style={StyleSheet.absoluteFill}
      objectFit="cover"
      mirror={mirror}
    />
  );
}

// S-ROOM-01 preview tile and `camera-self-preview`: my front camera, mirrored, sent to nobody.
export function CameraPreview({ style }: { style?: ViewStyle }) {
  const [track, setTrack] = useState<LocalVideoTrack | null>(null);
  useEffect(() => {
    let alive = true;
    let made: LocalVideoTrack | null = null;
    createLocalVideoTrack({ facingMode: 'user' }).then(
      (t) => {
        if (!alive) return t.stop();
        made = t;
        setTrack(t);
      },
      () => {},
    );
    return () => {
      alive = false;
      made?.stop();
    };
  }, []);
  if (!track) return null;
  return (
    <VideoView
      videoTrack={track}
      style={style ?? StyleSheet.absoluteFill}
      objectFit="cover"
      mirror
    />
  );
}
