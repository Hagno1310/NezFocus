import type { ChannelResponse } from '@nezfocus/shared';
import type { ActiveRoomSession } from '../../domain/servers/studyRoomSettings';
import { pickRepository } from '../fake';

type RoomSessionOf = (
  channel: Pick<ChannelResponse, 'focus_control'>,
  myId: string | null,
) => ActiveRoomSession | null;

// ponytail: no Room Session reaches the app yet; P3-B3.4 (#148) reads the real one
// (FOCUS_SESSION_*) for S-SET-07's session line and `switch-off-confirm`.
// EXPO_PUBLIC_FAKE=study-room: every Phòng học runs one, 9 people, I am the Host
// (spec 08 › Dữ liệu nhất quán), and turning it off ends it.
export const roomSessionOf = pickRepository<RoomSessionOf>('study-room', {
  remote: () => null,
  fake: (channel, myId) =>
    channel.focus_control === 'off' ? null : { participants: 9, host_id: myId },
});
