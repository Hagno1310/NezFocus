import { z } from 'zod';

// Paths are relative to /api/v1 (SRS 5.2); backend and app both read them from here.
export const HealthRoutes = {
  check: '/health',
} as const;

export const HealthResponse = z.object({
  status: z.literal('ok'),
  db: z.enum(['up', 'down']),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
