import { useQuery } from '@tanstack/react-query';
import { healthRepository } from '../../../data/health';
import { checkBackend } from '../../../domain/health/checkBackend';

// Presentation hook: reads through TanStack Query and calls a use case, never fetch directly.
export function useBackendStatus() {
  return useQuery({
    queryKey: ['backend-status'],
    queryFn: () => checkBackend(healthRepository),
  });
}
