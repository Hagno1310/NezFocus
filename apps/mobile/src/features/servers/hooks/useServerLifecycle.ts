import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react-native';
import { i18n } from '../../../shared/i18n';
import { showToast } from '../../../shared/ui/Toast';
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

// CR-17 #16: no answer → the connection Toast; an answer the screen has no words for → the
// generic one.
export function lifecycleErrorToast(err: unknown) {
  const answered = typeof (err as { code?: unknown } | null)?.code === 'number';
  showToast(
    answered
      ? { message: i18n.t('auth.errors.other') }
      : { message: i18n.t('auth.errors.network'), icon: WifiOff },
  );
}
