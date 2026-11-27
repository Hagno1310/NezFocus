import { Env } from './env.js';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
};
// What a phone reaches in production (the other tests are about secrets).
const reachable = {
  S3_PUBLIC_ENDPOINT: 'https://files.nezfocus.app',
  LIVEKIT_URL: 'wss://api.nezfocus.app/livekit',
  FCM_PROJECT_ID: 'nezfocus-app',
  FCM_CLIENT_EMAIL: 'push@nezfocus-app.iam.gserviceaccount.com',
  FCM_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

describe('Env', () => {
  it('refuses the sample JWT secret in production', () => {
    const sample = 'change-me-at-least-32-characters-long';
    expect(
      Env.safeParse({ ...base, NODE_ENV: 'production', JWT_SECRET: sample })
        .success,
    ).toBe(false);
    expect(
      Env.safeParse({ ...base, NODE_ENV: 'development', JWT_SECRET: sample })
        .success,
    ).toBe(true);
    expect(
      Env.safeParse({
        ...base,
        NODE_ENV: 'production',
        JWT_SECRET: 'q'.repeat(48),
        S3_SECRET_KEY: 's'.repeat(40),
        LIVEKIT_API_SECRET: 'l'.repeat(40),
        ...reachable,
      }).success,
    ).toBe(true);
  });

  it('refuses the dev S3 key in production', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'q'.repeat(48),
      LIVEKIT_API_SECRET: 'l'.repeat(40),
      ...reachable,
    };
    expect(Env.safeParse(prod).success).toBe(false);
    expect(Env.safeParse({ ...prod, NODE_ENV: 'development' }).success).toBe(
      true,
    );
  });

  it('refuses the dev LiveKit secret in production (REQ-VC-01)', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'q'.repeat(48),
      S3_SECRET_KEY: 's'.repeat(40),
      ...reachable,
    };
    expect(Env.safeParse(prod).success).toBe(false);
    expect(
      Env.safeParse({ ...prod, LIVEKIT_API_SECRET: 'l'.repeat(40) }).success,
    ).toBe(true);
  });

  it('refuses a production without the FCM service account (REQ-NOTIF-02)', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'q'.repeat(48),
      S3_SECRET_KEY: 's'.repeat(40),
      LIVEKIT_API_SECRET: 'l'.repeat(40),
      ...reachable,
    };
    expect(Env.safeParse(prod).success).toBe(true);
    const { FCM_PRIVATE_KEY: _, ...noKey } = prod;
    expect(Env.safeParse(noKey).success).toBe(false);
    // Outside production the push is only logged.
    expect(Env.safeParse({ ...base, JWT_SECRET: 'q'.repeat(48) }).success).toBe(
      true,
    );
  });

  it('refuses phone-facing URLs a phone cannot reach in production', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'q'.repeat(48),
      S3_SECRET_KEY: 's'.repeat(40),
      LIVEKIT_API_SECRET: 'l'.repeat(40),
      ...reachable,
    };
    expect(Env.safeParse(prod).success).toBe(true);
    for (const bad of [
      { S3_PUBLIC_ENDPOINT: undefined },
      { S3_PUBLIC_ENDPOINT: 'http://s3:8333' },
      { S3_PUBLIC_ENDPOINT: 'https://localhost:8333' },
      { LIVEKIT_URL: 'ws://api.nezfocus.app/livekit' },
      { LIVEKIT_URL: 'wss://127.0.0.1:7880' },
    ])
      expect(Env.safeParse({ ...prod, ...bad }).success).toBe(false);
  });
});
