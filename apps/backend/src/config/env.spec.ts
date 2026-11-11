import { Env } from './env.js';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
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
      }).success,
    ).toBe(true);
  });

  it('refuses the dev S3 key in production', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'q'.repeat(48),
    };
    expect(Env.safeParse(prod).success).toBe(false);
    expect(Env.safeParse({ ...prod, NODE_ENV: 'development' }).success).toBe(
      true,
    );
  });
});
