import type { HealthRepository } from '../../domain/health/HealthRepository';

export const fakeHealthRepository: HealthRepository = {
  ping: async () => ({ status: 'ok', db: 'up' }),
};
