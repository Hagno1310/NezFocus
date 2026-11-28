import { Permission, hasPermission } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { myChannelPermissions } from '../../../domain/servers/channelPermissions';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';
import { roomSessionsStore } from '../../../domain/study/roomSessions';
import { successorOf } from '../../../domain/study/roomView';
import { seatsIn } from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { useMembers } from './useMembers';
import { useServerAccess } from './useServerAccess';

export type MyRoomLine = {
  serverId: string;
  room: string; // "Bạn cũng sẽ rời {Phòng học im lặng}."
  // Host of the running Room Session: who takes over ("Chi sẽ điều khiển phiên học."),
  // null when nobody may (REQ-STUDY-11); undefined when I am not the Host.
  successor?: string | null;
};

// SRV-05 AC5 `leave-confirm-in-room` / `leave-confirm-host`, AUTH-07 AC3 `logout-confirm-host`:
// the room I sit in and, as Host, who will run the session after me.
export function useMyRoomLine(): MyRoomLine | null {
  const call = useStore(voiceStore, (s) => s.call);
  const seats = useStore(voiceStore, (s) => s.seats);
  const meId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const serverId = call?.serverId ?? '';
  const channels = useStore(homeStore, (s) => s.channels[serverId]);
  const session = useStore(roomSessionsStore, (s) =>
    call ? s.byChannel[call.channelId] : undefined,
  );
  const access = useServerAccess(call ? serverId : null);
  const members = useMembers(serverId).data;
  if (!call) return null;
  const channel = channels?.find((c) => c.id === call.channelId);
  const line: MyRoomLine = { serverId, room: channel?.name ?? '' };
  if (!session || session.host_id !== meId || !channel) return line;
  const nameOf = (id: string) => {
    const user = members?.find((m) => m.user.id === id)?.user;
    return user?.display_name ?? user?.username ?? '';
  };
  const next = successorOf(
    seatsIn(seats, call.channelId),
    meId,
    channel.focus_control,
    (id) => {
      const m = members?.find((x) => x.user.id === id);
      return (
        !!m &&
        !!access &&
        hasPermission(
          myChannelPermissions(
            access.server,
            access.roles ?? [],
            id,
            m.role_ids,
            channel,
            channels ?? [],
          ),
          Permission.MANAGE_STUDY_ROOMS,
        )
      );
    },
  );
  return { ...line, successor: next === null ? null : nameOf(next) };
}
