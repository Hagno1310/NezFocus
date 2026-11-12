import { z } from 'zod';

// Sample values from .env.example, infra/.env.prod.example and CI.
const PLACEHOLDER_SECRET = /^(change-me|dev-only|ci-only)/;

export const Env = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    // HS256 key for access tokens (REQ-AUTH-02). Generate: openssl rand -base64 48
    JWT_SECRET: z.string().min(32),
    WORKER_ID: z.coerce.number().int().min(0).max(1023).default(0),
    // Object storage (SRS 5.3 Upload). Defaults match infra/docker-compose.yml (SeaweedFS).
    S3_ENDPOINT: z.string().url().default('http://localhost:8333'),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().default('nezfocus'),
    S3_SECRET_KEY: z.string().default('nezfocus-dev-secret'),
    S3_BUCKET: z.string().default('nezfocus'),
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' || !PLACEHOLDER_SECRET.test(env.JWT_SECRET),
    {
      path: ['JWT_SECRET'],
      message: 'still the sample value; generate a real secret',
    },
  )
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      env.S3_SECRET_KEY !== 'nezfocus-dev-secret',
    {
      path: ['S3_SECRET_KEY'],
      message: 'still the dev value; set the real key',
    },
  );

export type Env = z.infer<typeof Env>;

// Fail fast at boot with a readable list instead of crashing on first use.
export const validateEnv = (raw: Record<string, unknown>) => Env.parse(raw);
