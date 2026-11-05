import { z } from 'zod';

// Paths are relative to /api/v1 (SRS 5.2); backend and app both read them from here.
export const HealthRoutes = {
  // No REQ (infra). DB down → HTTP 503, not an SRS 5.2 error body.
  check: '/health',
} as const;

export const HealthResponse = z.object({
  status: z.literal('ok'),
  db: z.literal('up'),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
