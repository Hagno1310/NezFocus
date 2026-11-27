import type { ChannelResponse } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { roomSessionOf } from '../../../data/study/roomSessions';
import type { ActiveRoomSession } from '../../../domain/servers/studyRoomSettings';
import { roomSessionsStore } from '../../../domain/study/roomSessions';
import { seatsIn } from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';

// The Room Session running in a Phòng học, for S-SET-07 and S-SET-06 `delete-confirm`.
export function useRoomSession(
  channel: Pick<ChannelResponse, 'id' | 'focus_control'> | undefined,
  myId: string | null,
): ActiveRoomSession | null {
  const id = channel?.id ?? '';
  const session = useStore(roomSessionsStore, (s) => s.byChannel[id] ?? null);
  const people = useStore(voiceStore, (s) => seatsIn(s.seats, id).length);
  return channel ? roomSessionOf(channel, myId, { session, people }) : null;
}
