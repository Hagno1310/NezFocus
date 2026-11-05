import { HealthRoutes } from '@nezfocus/shared';
import type { HealthRepository } from '../../domain/health/HealthRepository';
import { api } from '../api/client';

export const remoteHealthRepository: HealthRepository = {
  ping: () => api(HealthRoutes.check),
};
