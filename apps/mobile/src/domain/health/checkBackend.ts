import type { HealthRepository } from './HealthRepository';

export type BackendStatus = 'up' | 'down';

// Use case: plain TypeScript, no React/RN imports, so it runs under vitest without a device.
export async function checkBackend(
  repo: HealthRepository,
): Promise<BackendStatus> {
  try {
    await repo.ping();
    return 'up';
  } catch {
    return 'down';
  }
}
