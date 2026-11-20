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
