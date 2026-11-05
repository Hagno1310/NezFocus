import { HealthRoutes } from '@nezfocus/shared';
import type { HealthRepository } from '../../domain/health/HealthRepository';
import { api } from '../api';

export const remoteHealthRepository: HealthRepository = {
  ping: () => api.request(HealthRoutes.check, { auth: false }),
};
