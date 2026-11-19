import { Permission, hasPermission } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { homeStore } from '../../../domain/servers/homeStore';
import { useServerAccess } from '../../servers/hooks/useServerAccess';

// S-HOME-01 `forbidden`: no SEND_MESSAGES here. Until the roles are known the composer stays
// open; the backend refuses with 40302 and the message turns `failed`.
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
