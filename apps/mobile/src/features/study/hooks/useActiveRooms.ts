import { Permission, hasPermission, roomTimer } from '@nezfocus/shared';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { friendsStore } from '../../../domain/friends/friends';
import { myChannelPermissions } from '../../../domain/servers/channelPermissions';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';
import {
  activeRooms,
  keepRoomOrder,
  type RoomCandidate,
} from '../../../domain/study/activeRooms';
import { roomSessionsStore } from '../../../domain/study/roomSessions';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { avatarUri } from '../../me/avatarUri';
import { roomListLabel } from '../format';
import { useNow } from './useSolo';

export type RoomRowData = {
  channelId: string;
  serverId: string;
  name: string;
  phase: 'focus' | 'short_break' | 'long_break';
  state: 'running' | 'paused';
  label: string; // C-16 `list`
  mine: boolean;
  friends: { name: string; uri: string | null }[];
  line: string; // "Bình, Chi và 6 người · Ôn thi GT2"
};

const FRIENDS_NAMED = 2; // spec 04: "{Bạn A}, {Bạn B} và {N} người"

// S-STUDY-01 / S-STUDY-06 "Đang học lúc này" (CR-28 #38: READY.focus_sessions + FOCUS_SESSION_*,
// filtered here by VIEW_CHANNEL + CONNECT). Sorted when the tab gets focus or on `resort`.
export function useActiveRooms() {
  const { t } = useTranslation();
  const byChannel = useStore(roomSessionsStore, (s) => s.byChannel);
  const offsetMs = useStore(roomSessionsStore, (s) => s.offsetMs);
  const seats = useStore(voiceStore, (s) => s.seats);
  const myChannel = useStore(voiceStore, (s) =>
    s.call?.phase === 'in' ? s.call.channelId : null,
  );
  const home = useStore(homeStore);
  const meId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const byUser = useStore(friendsStore, (s) => s.byUser);
  const now = useNow(1000).getTime();

  const friendIds = useMemo(
    () =>
      new Set(
        Object.values(byUser)
          .filter((r) => r.type === 'friend')
          .map((r) => r.user.id),
      ),
    [byUser],
  );

  const sorted = useMemo(() => {
    const candidates: RoomCandidate[] = [];
    for (const f of Object.values(byChannel)) {
      const server = home.servers?.find((x) => x.id === f.server_id);
      const channels = home.channels[f.server_id];
      const channel = channels?.find((c) => c.id === f.channel_id);
      // Kicked out, or the server's channels not loaded yet (the lifecycle loads them).
      if (!server || !channel) continue;
      const perms = myChannelPermissions(
        server,
        home.roles[f.server_id] ?? [],
        meId,
        home.myRoleIds[f.server_id] ?? [],
        channel,
        channels ?? [],
      );
      candidates.push({
        session: f,
        people: Object.values(seats)
          .filter((m) => m.channel_id === f.channel_id)
          .map((m) => m.user_id),
        canJoin:
          hasPermission(perms, Permission.VIEW_CHANNEL) &&
          hasPermission(perms, Permission.CONNECT),
      });
    }
    return activeRooms(candidates, meId, myChannel, friendIds);
  }, [byChannel, home, seats, meId, myChannel, friendIds]);

  const [order, setOrder] = useState<string[] | null>(null);
  const ids = keepRoomOrder(
    order,
    sorted.map((r) => r.channelId),
  );
  // Spec 04 › Sắp xếp: sorted again on coming back to the tab and on pull to refresh.
  const resort = useCallback(() => setOrder(null), []);
  useFocusEffect(resort);
  if (
    order === null ||
    ids.length !== order.length ||
    ids.some((id, i) => id !== order[i])
  )
    setOrder(ids);

  const rows: RoomRowData[] = ids.flatMap((id) => {
    const r = sorted.find((x) => x.channelId === id);
    if (!r) return [];
    const server = home.servers?.find((x) => x.id === r.serverId);
    const channel = home.channels[r.serverId]?.find((c) => c.id === id);
    const timer = roomTimer(r.session, offsetMs, now);
    const named = r.friends
      .map((fid) => byUser[fid]?.user)
      .filter((u) => !!u)
      .map((u) => ({
        name: u.display_name ?? u.username ?? '',
        uri: avatarUri(u.avatar ?? null, '128') ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .slice(0, FRIENDS_NAMED);
    const rest = r.people - named.length;
    const serverName = server?.name ?? '';
    const friendsText = named.map((f) => f.name).join(', ');
    return [
      {
        channelId: id,
        serverId: r.serverId,
        name: channel?.name ?? '',
        phase: timer.phase,
        state: timer.status === 'paused' ? 'paused' : 'running',
        label: roomListLabel(t, timer),
        mine: r.mine,
        friends: named,
        line: !named.length
          ? t('study.home.people', { n: r.people, server: serverName })
          : rest > 0
            ? t('study.home.peopleFriends', {
                friends: friendsText,
                n: rest,
                server: serverName,
              })
            : t('study.home.friendsOnly', {
                friends: friendsText,
                server: serverName,
              }),
      },
    ];
  });
  return { rows, resort };
}
