import type { ChannelResponse } from '@nezfocus/shared';
import type { ActiveRoomSession } from '../../domain/servers/studyRoomSettings';
import { pickRepository } from '../fake';

type RoomSessionOf = (
  channel: Pick<ChannelResponse, 'focus_control'>,
  myId: string | null,
) => ActiveRoomSession | null;

// ponytail: no Room Session reaches the app yet (none); P3-B3.4 (#148) reads the real one.
// EXPO_PUBLIC_FAKE=study-room: spec 08 › Dữ liệu nhất quán — each Phòng học has 9 people, I host.
export const roomSessionOf = pickRepository<RoomSessionOf>('study-room', {
  remote: () => null,
  fake: (channel, myId) =>
    channel.focus_control === 'off' ? null : { participants: 9, host_id: myId },
});
