import type { VoiceRoomMember } from '@nezfocus/shared';
import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { friendsStore } from '../../../domain/friends/friends';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { myChannelPermissions } from '../../../domain/servers/channelPermissions';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';
import { mediaDenied } from '../../../domain/voice/mediaDenied';
import { roomLayout } from '../../../domain/voice/roomLayout';
import {
  keepOrder,
  ringOrder,
  seatsIn,
} from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { useMembers } from '../../servers/hooks/useMembers';
import { useServerAccess } from '../../servers/hooks/useServerAccess';
import { avatarUri } from '../../me/avatarUri';

const MY_SEAT_JOINED = new Date(0).toISOString();

const sameIds = (a: readonly string[] | null, b: readonly string[]) =>
  !!a && a.length === b.length && a.every((id, i) => id === b[i]);

export type RoomTile = {
  userId: string;
  name: string;
  avatar: string | null;
  self: boolean;
  mic: 'on' | 'mod-muted' | null;
  camera: boolean;
  speaking: boolean;
  away: boolean;
  poorNetwork: boolean;
};

// S-ROOM-01: the channel, my call in it (or elsewhere), and the tiles in C-18 order. In a Room
// Session (`host` given, null = no Host) the C-06 seat order: Host second, "+N" by priority.
export function useVoiceRoom(
  serverId: string,
  channelId: string,
  host?: string | null,
) {
  const access = useServerAccess(serverId);
  const channel = useStore(homeStore, (s) =>
    s.channels[serverId]?.find((c) => c.id === channelId),
  );
  const me = useStore(sessionStore, (s) => s.user);
  const call = useStore(voiceStore, (s) => s.call);
  const seats = useStore(voiceStore, (s) => s.seats);
  const speaking = useStore(voiceStore, (s) => s.speaking);
  const cameraPreviewed = useStore(voiceStore, (s) => s.cameraPreviewed);
  const online = useStore(gatewayStore, (s) => s.online);
  const denied = useStore(mediaDenied);
  const byUser = useStore(friendsStore, (s) => s.byUser);
  const members = useMembers(serverId, channelId).data;

  const here = call?.channelId === channelId ? call : null;
  const joined = here?.phase === 'in';
  const meId = me?.id ?? null;

  const room = useMemo(() => {
    const list: VoiceRoomMember[] = seatsIn(seats, channelId);
    // My seat shows as soon as LiveKit is in, before the backend's VOICE_STATE_UPDATE.
    if (here && joined && meId && !list.some((m) => m.user_id === meId))
      list.push({
        user_id: meId,
        channel_id: channelId,
        server_id: serverId,
        self_mute: !here.mic,
        self_video: here.camera,
        mod_muted: false,
        joined_at: MY_SEAT_JOINED, // "Bạn" is first whatever the time
        away: false,
      });
    return list;
  }, [seats, channelId, serverId, here, joined, meId]);

  const friends = useMemo(
    () =>
      new Set(
        Object.values(byUser)
          .filter((r) => r.type === 'friend')
          .map((r) => r.user.id),
      ),
    [byUser],
  );
  // Kept from render to render (C-18: nobody moves once placed).
  const [ids, setIds] = useState<string[] | null>(null);
  const next =
    host === undefined
      ? keepOrder(ids, room, meId, friends)
      : ringOrder(ids, room, meId, friends, host);
  if (!sameIds(ids, next)) setIds(next);

  const people = useMemo(
    () => new Map(members?.map((m) => [m.user.id, m.user])),
    [members],
  );
  const speakingSet = useMemo(() => new Set(speaking), [speaking]);
  const poor = useStore(voiceStore, (s) => s.poor);
  const poorSet = useMemo(() => new Set(poor), [poor]);
  const tiles: RoomTile[] = next.flatMap((id) => {
    const seat = room.find((m) => m.user_id === id);
    if (!seat) return [];
    const self = id === meId;
    const user = people.get(id);
    // My own Mic answers at once (STUDY-02 AC2); others as the backend tells.
    const micOn = self && here ? here.mic : !seat.self_mute;
    return [
      {
        userId: id,
        name: user?.display_name ?? user?.username ?? '',
        avatar: avatarUri(user?.avatar ?? null, '128') ?? null,
        self,
        mic: seat.mod_muted ? 'mod-muted' : micOn ? 'on' : null,
        camera: self && here ? here.camera : seat.self_video,
        speaking: speakingSet.has(id),
        away: seat.away,
        poorNetwork: poorSet.has(id),
      },
    ];
  });

  const perms = channel && access ? access.channelPerms(channel) : 0n;
  const channels = useStore(homeStore, (s) => s.channels[serverId]);
  // Someone else's permissions here (S-ROOM-05: who may take the Host seat).
  const permsOf = (userId: string) => {
    const m = members?.find((x) => x.user.id === userId);
    return m && channel && access
      ? myChannelPermissions(
          access.server,
          access.roles ?? [],
          userId,
          m.role_ids,
          channel,
          channels ?? [],
        )
      : 0n;
  };
  const nameOf = (id: string) => {
    const user = people.get(id);
    return user?.display_name ?? user?.username ?? '';
  };

  const layout =
    channel && access
      ? roomLayout({
          focusControl: channel.focus_control,
          perms,
          joined,
          online,
        })
      : null;

  return {
    channel,
    layout,
    tiles,
    call,
    here,
    joined,
    elsewhere: !!call && !here,
    online,
    denied,
    cameraPreviewed,
    perms,
    nameOf,
    permsOf,
    seats: room,
  };
}
