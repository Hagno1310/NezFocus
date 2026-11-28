import { useQuery, useQueryClient } from '@tanstack/react-query';
import { serverGone } from '../serverGone';
import { serverRepository } from '../../../data/servers';
import {
  addServer,
  applyGatewayEvent,
  homeStore,
} from '../../../domain/servers/homeStore';

export const deletedServersKey = ['servers', 'deleted'] as const;

// REQ-SRV-05. The rail changes here at once; the Gateway's own event then finds nothing to do.
export function useServerLifecycle() {
  const qc = useQueryClient();
  return {
    async leave(serverId: string) {
      await serverRepository.leaveServer(serverId);
      serverGone(serverId, 'left');
    },
    async remove(serverId: string) {
      await serverRepository.deleteServer(serverId);
      serverGone(serverId, 'deleted_here');
      void qc.invalidateQueries({ queryKey: deletedServersKey });
    },
    async restore(serverId: string) {
      const server = await serverRepository.restoreServer(serverId);
      addServer(server);
      void qc.invalidateQueries({ queryKey: deletedServersKey });
      return server;
    },
    // A3: the leave Dialog right after must already see the new Owner.
    async transfer(serverId: string, userId: string, password: string) {
      await serverRepository.transferOwner(serverId, userId, password);
      const server = homeStore
        .getState()
        .servers?.find((s) => s.id === serverId);
      if (server)
        applyGatewayEvent({
          t: 'SERVER_UPDATE',
          d: { ...server, owner_id: userId },
          s: 0,
        });
    },
  };
}

// 02 S-HOME-06 `restore` / `restore-list`.
export function useDeletedServers() {
  return useQuery({
    queryKey: deletedServersKey,
    queryFn: () => serverRepository.listDeletedServers(),
  });
}
