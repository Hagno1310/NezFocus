import type { HealthRepository } from './HealthRepository';

export type BackendStatus = 'up' | 'degraded' | 'down';

// Use case: plain TypeScript, no React/RN imports, so it runs under vitest without a device.
export async function checkBackend(
  repo: HealthRepository,
): Promise<BackendStatus> {
  try {
    const res = await repo.ping();
    return res.db === 'up' ? 'up' : 'degraded';
  } catch {
    return 'down';
  }
}
