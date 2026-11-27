import type { ChannelResponse } from '@nezfocus/shared';
import { roomSessionOf } from '../../../data/study/roomSessions';
import type { ActiveRoomSession } from '../../../domain/servers/studyRoomSettings';

// The Room Session running in a Phòng học, for S-SET-07 (data/study/roomSessions.ts).
export const useRoomSession = (
  channel: Pick<ChannelResponse, 'focus_control'> | undefined,
  myId: string | null,
): ActiveRoomSession | null => (channel ? roomSessionOf(channel, myId) : null);
