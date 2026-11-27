import type { ChannelResponse, FocusSessionState } from '@nezfocus/shared';
import type { ActiveRoomSession } from '../../domain/servers/studyRoomSettings';
import { pickRepository } from '../fake';

type RoomSessionOf = (
  channel: Pick<ChannelResponse, 'focus_control'>,
  myId: string | null,
  live: { session: FocusSessionState | null; people: number },
) => ActiveRoomSession | null;

// S-SET-07: the room's Room Session (CR-28 #38: people from voice_states).
// EXPO_PUBLIC_FAKE=study-room: spec 08 › Dữ liệu nhất quán — each Phòng học has 9 people, I host.
export const roomSessionOf = pickRepository<RoomSessionOf>('study-room', {
  remote: (_channel, _myId, { session, people }) =>
    session && { participants: people, host_id: session.host_id },
  fake: (channel, myId) =>
    channel.focus_control === 'off' ? null : { participants: 9, host_id: myId },
});
