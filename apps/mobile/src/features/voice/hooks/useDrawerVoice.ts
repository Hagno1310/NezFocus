import { useMemo } from 'react';
import { useStore } from 'zustand';
import { friendsStore } from '../../../domain/friends/friends';
import { sessionStore } from '../../../domain/session/sessionStore';
import { orderSeats, seatsIn } from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { avatarUri } from '../../me/avatarUri';
import { useMembers } from '../../servers/hooks/useMembers';

export type RoomPerson = { name: string; uri: string | null };

// 02 S-HOME-02 / C-05 `voice-occupied`, `connected`: who sits in each voice room of the server
// (C-18 order, friends before others) and the room I am in on this phone.
export function useDrawerVoice(serverId: string) {
  const seats = useStore(voiceStore, (s) => s.seats);
  const inRoom = useStore(voiceStore, (s) =>
    s.call?.phase === 'in' && s.call.serverId === serverId
      ? s.call.channelId
      : null,
  );
  const me = useStore(sessionStore, (s) => s.user?.id ?? null);
  const byUser = useStore(friendsStore, (s) => s.byUser);
  const members = useMembers(serverId).data;

  const peopleOf = useMemo(() => {
    const friends = new Set(
      Object.values(byUser)
        .filter((r) => r.type === 'friend')
        .map((r) => r.user.id),
    );
    const users = new Map(members?.map((m) => [m.user.id, m.user]));
    return (channelId: string): RoomPerson[] =>
      orderSeats(seatsIn(seats, channelId), me, friends).map((seat) => {
        const user = users.get(seat.user_id);
        return {
          name: user?.display_name ?? user?.username ?? '',
          uri: avatarUri(user?.avatar ?? null, '128') ?? null,
        };
      });
  }, [seats, me, byUser, members]);

  return { peopleOf, inRoom };
}
