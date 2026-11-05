import { z } from 'zod';

export const Env = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  // HS256 key for access tokens (REQ-AUTH-02). Generate: openssl rand -base64 48
  JWT_SECRET: z.string().min(32),
  WORKER_ID: z.coerce.number().int().min(0).max(1023).default(0),
});

export type Env = z.infer<typeof Env>;

// Fail fast at boot with a readable list instead of crashing on first use.
export const validateEnv = (raw: Record<string, unknown>) => Env.parse(raw);
