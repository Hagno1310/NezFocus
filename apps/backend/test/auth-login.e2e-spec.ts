import { randomInt } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  CapturingMailer,
  completion,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const PASSWORD = completion('x').password;

// Redis keeps per-IP counters across runs, so each test signs in from its own addresses.
const randomIp = () => `198.51.${randomInt(0, 256)}.${randomInt(1, 255)}`;

// REQ-AUTH-02, REQ-AUTH-04 through HTTP, Postgres and Redis. Needs `pnpm dev:infra`.
describe('Password sign-in and refresh (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  // Email code → Complete account; returns the email and the device used.
  const completedAccount = async () => {
    const email = uniqueEmail();
    const dev = device();
    const session = await signInWithCode(app, mailer, email, dev);
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    return { email, dev };
  };

  const login = (email: string, password: string, ip: string, dev = device()) =>
    http(app)
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email, password, device: dev });

  const refresh = (token: string) =>
    http(app).post('/auth/refresh').send({ refresh_token: token });

  it('signs up, signs in, refreshes, and closes the session when an old token comes back (AUTH-02 AC1, AUTH-04 AC1–AC2)', async () => {
    const { email, dev } = await completedAccount();

    const signedIn = await login(email, PASSWORD, randomIp(), dev).expect(200);
    expect(signedIn.body).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      expires_in: 900,
      session_id: expect.stringMatching(/^\d+$/),
      user: { email, account_completed: true },
    });
    const first = signedIn.body.refresh_token as string;

    const rotated = await refresh(first).expect(200);
    expect(rotated.body).toEqual({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      expires_in: 900,
    });
    await http(app)
      .get('/e2e-probe')
      .auth(rotated.body.access_token, { type: 'bearer' })
      .expect(200);

    const reused = await refresh(first).expect(401);
    expect(reused.body).toMatchObject({
      code: 40103,
      reason: 'reuse_detected',
    });

    // The whole family is gone: the newest token and its access token stop working too.
    const newest = await refresh(rotated.body.refresh_token).expect(401);
    expect(newest.body.code).toBe(40103);
    const probe = await http(app)
      .get('/e2e-probe')
      .auth(rotated.body.access_token, { type: 'bearer' })
      .expect(401);
    expect(probe.body).toMatchObject({ code: 40100, reason: 'reuse_detected' });
  });

  it('answers 40102 the same way for a wrong password and an unknown email (AUTH-02 AC2)', async () => {
    const { email } = await completedAccount();
    const ip = randomIp();
    const wrong = await login(email, 'Sai2026!!', ip).expect(401);
    const unknown = await login(uniqueEmail(), PASSWORD, ip).expect(401);
    for (const res of [wrong, unknown]) {
      expect(res.body).toMatchObject({
        code: 40102,
        message: 'Wrong email or password',
      });
    }
  });

  it('makes one IP wait after 5 wrong tries, without blocking the owner elsewhere (AUTH-02 AC3)', async () => {
    const { email } = await completedAccount();
    const attacker = randomIp();
    for (let i = 0; i < 5; i++)
      await login(email, 'Sai2026!!', attacker).expect(401);

    const blocked = await login(email, PASSWORD, attacker).expect(429);
    expect(blocked.body.code).toBe(40029);
    const retryAfter = Number(blocked.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(540);
    expect(retryAfter).toBeLessThanOrEqual(600);
    expect(blocked.body.retry_after).toBe(retryAfter);

    await login(email, PASSWORD, randomIp()).expect(200);
  });

  it('emails an alert when a new device signs in (AUTH-02)', async () => {
    const { email, dev } = await completedAccount();
    await login(email, PASSWORD, randomIp(), dev).expect(200);
    expect(mailer.alerts).not.toContain(email);
    await login(email, PASSWORD, randomIp(), device()).expect(200);
    expect(mailer.alerts).toContain(email);
  });

  it('answers 40100 for a refresh token it never issued', async () => {
    const res = await refresh('not-a-real-token').expect(401);
    expect(res.body.code).toBe(40100);
  });
});
