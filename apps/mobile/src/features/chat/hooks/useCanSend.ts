import { Permission, hasPermission } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { homeStore } from '../../../domain/servers/homeStore';
import { useServerAccess } from '../../servers/hooks/useServerAccess';

// S-HOME-01 `forbidden`; until roles are known it stays open and a 40302 turns the message failed.
export function useCanSend(serverId: string | null, channelId: string) {
  const access = useServerAccess(serverId);
  const channel = useStore(homeStore, (s) =>
    serverId
      ? s.channels[serverId]?.find((c) => c.id === channelId)
      : undefined,
  );
  if (!access || !channel || !access.roles) return true;
  return hasPermission(access.channelPerms(channel), Permission.SEND_MESSAGES);
}

// S-HOME-04: MANAGE_MESSAGES (Xóa others', tin hệ thống) and ADD_REACTIONS in this channel. A DM
// has neither role nor overwrite: reactions on, deleting others' never (MSG-05 AC7).
// ponytail: timedOut needs my own timeout_until, which the app learns with S-HOME-01
// `timed-out`, P3-A3.4 (#129); until then the backend's 40302 shows "Bạn không còn quyền làm việc này".
export function useChannelAbilities(
  serverId: string | null,
  channelId: string,
) {
  const access = useServerAccess(serverId);
  const channel = useStore(homeStore, (s) =>
    serverId
      ? s.channels[serverId]?.find((c) => c.id === channelId)
      : undefined,
  );
  if (!serverId) return { canManage: false, canReact: true, timedOut: false };
  if (!access || !channel || !access.roles)
    return { canManage: false, canReact: true, timedOut: false };
  const perms = access.channelPerms(channel);
  return {
    canManage: hasPermission(perms, Permission.MANAGE_MESSAGES),
    canReact: hasPermission(perms, Permission.ADD_REACTIONS),
    timedOut: false,
  };
}
