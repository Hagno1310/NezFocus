import type { ChannelResponse } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { myChannelPermissions } from '../../../domain/servers/channelPermissions';
import {
  myServerPermissions,
  serverMenuRows,
  serverSettingsRows,
} from '../../../domain/servers/serverAccess';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';

// False while signed out and until READY: no server is known yet, none is lost.
export const useServerListLoaded = () =>
  useStore(homeStore, (s) => s.servers !== null);

// The server as the drawer knows it, and the rows the caller may see (Q17).
export function useServerAccess(serverId: string | null) {
  const server = useStore(homeStore, (s) =>
    s.servers?.find((x) => x.id === serverId),
  );
  const roles = useStore(homeStore, (s) =>
    serverId ? s.roles[serverId] : undefined,
  );
  const roleIds = useStore(homeStore, (s) =>
    serverId ? s.myRoleIds[serverId] : undefined,
  );
  const channels = useStore(homeStore, (s) =>
    serverId ? s.channels[serverId] : undefined,
  );
  const userId = useStore(sessionStore, (s) => s.user?.id ?? null);
  if (!server) return null;
  const perms = myServerPermissions(server, roles, userId, roleIds);
  const isOwner = server.owner_id === userId;
  return {
    server,
    roles,
    roleIds: roleIds ?? [],
    userId,
    perms,
    isOwner,
    menuRows: serverMenuRows(perms, isOwner),
    settingsRows: serverSettingsRows(perms, isOwner),
    // In one channel: its overwrites (or its category's while synced) apply.
    channelPerms: (channel: ChannelResponse) =>
      userId
        ? myChannelPermissions(
            server,
            roles ?? [],
            userId,
            roleIds ?? [],
            channel,
            channels ?? [],
          )
        : 0n,
  };
}
