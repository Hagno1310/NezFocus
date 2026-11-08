import { useStore } from 'zustand';
import {
  myServerPermissions,
  serverMenuRows,
  serverSettingsRows,
} from '../../../domain/servers/serverAccess';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';

// The server as the drawer knows it, and the rows the caller may see (Q17).
export function useServerAccess(serverId: string | null) {
  const server = useStore(homeStore, (s) =>
    s.servers?.find((x) => x.id === serverId),
  );
  const roles = useStore(homeStore, (s) =>
    serverId ? s.roles[serverId] : undefined,
  );
  const userId = useStore(sessionStore, (s) => s.user?.id ?? null);
  if (!server) return null;
  const perms = myServerPermissions(server, roles, userId);
  const isOwner = server.owner_id === userId;
  return {
    server,
    roles,
    perms,
    isOwner,
    menuRows: serverMenuRows(perms, isOwner),
    settingsRows: serverSettingsRows(perms, isOwner),
  };
}
