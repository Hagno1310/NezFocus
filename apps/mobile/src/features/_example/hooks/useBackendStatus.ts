import { useQuery } from '@tanstack/react-query';
import { remoteHealthRepository } from '../../../data/health/RemoteHealthRepository';
import { checkBackend } from '../../../domain/health/checkBackend';

// Presentation hook: reads through TanStack Query and calls a use case, never fetch directly.
export function useBackendStatus() {
  return useQuery({
    queryKey: ['backend-status'],
    queryFn: () => checkBackend(remoteHealthRepository),
  });
}
