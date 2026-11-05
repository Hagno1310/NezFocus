import type { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  device,
  http,
  resetResendLimit,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

// REQ-AUTH-01, REQ-AUTH-13 through HTTP, Postgres and Redis. Needs `pnpm dev:infra`.
describe('Sign up with an email code (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const userCount = async (email: string) => {
    const result = await db.execute(
      sql`select count(*)::int as n from users where email = ${email}`,
    );
    return (result.rows[0] as { n: number }).n;
  };

  const withoutRequestId = (body: Record<string, unknown>) => {
    const { request_id: _, ...rest } = body;
    return rest;
  };

  it('sends a code, creates the account only on the right code, then completes it (AUTH-01 AC1, AUTH-13 AC1)', async () => {
    const api = http(app);
    const email = uniqueEmail();
    const dev = device();

    const sent = await api
      .post('/auth/email-code')
      .send({ email, device: dev })
      .expect(200);
    expect(sent.body).toEqual({ expires_in: 900, resend_in: 60 });
    expect(mailer.codes.get(email)).toMatch(/^\d{6}$/);
    expect(await userCount(email)).toBe(0);

    const signedIn = await api
      .post('/auth/email-code/verify')
      .send({ email, code: mailer.codes.get(email), device: dev })
      .expect(200);
    expect(signedIn.body).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      expires_in: 900,
      session_id: expect.stringMatching(/^\d+$/),
      user: { email, username: null, account_completed: false },
      suggested_username: email.split('@')[0],
    });
    expect(await userCount(email)).toBe(1);

    const username = uniqueUsername();
    const done = await api
      .post('/auth/complete-account')
      .auth(signedIn.body.access_token, { type: 'bearer' })
      .send(completion(username))
      .expect(200);
    expect(done.body).toMatchObject({ username, account_completed: true });

    const [row] = (
      await db.execute(
        sql`select u.terms_version, u.terms_accepted_at, u.password_hash, s.timezone, s.locale
            from users u join user_settings s on s.user_id = u.id where u.email = ${email}`,
      )
    ).rows as Record<string, unknown>[];
    expect(row).toMatchObject({
      terms_version: completion(username).terms_version,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
    });
    expect(row.terms_accepted_at).not.toBeNull();
    expect(String(row.password_hash)).toMatch(/^\$argon2id\$/);
  });

  it('answers the same whether or not the email has an account, and signs in to it (AUTH-01 AC2b)', async () => {
    const api = http(app);
    const known = uniqueEmail();
    const first = await signInWithCode(app, mailer, known);
    await resetResendLimit(app, known);

    const fresh = await api
      .post('/auth/email-code')
      .send({ email: uniqueEmail(), device: device() })
      .expect(200);
    const existing = await api
      .post('/auth/email-code')
      .send({ email: known, device: device() })
      .expect(200);
    expect(existing.body).toEqual(fresh.body);

    await resetResendLimit(app, known);
    const again = await signInWithCode(app, mailer, known);
    expect(again.user.id).toBe(first.user.id);
  });

  it('blocks other APIs until the account is completed (AUTH-01 AC5)', async () => {
    const api = http(app);
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const probe = () =>
      api.get('/e2e-probe').auth(session.access_token, { type: 'bearer' });

    const blocked = await probe().expect(403);
    expect(blocked.body.code).toBe(40309);

    await api
      .get(`/auth/username-available?username=${uniqueUsername()}`)
      .auth(session.access_token, { type: 'bearer' })
      .expect(200, { available: true });

    await api
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    await probe().expect(200, { ok: true });
  });

  it('rejects requests without a valid access token (40100)', async () => {
    const res = await http(app).get('/e2e-probe').expect(401);
    expect(res.body.code).toBe(40100);
    await http(app)
      .get('/e2e-probe')
      .auth('not-a-jwt', { type: 'bearer' })
      .expect(401);
  });

  describe('Complete account validation', () => {
    let token: string;
    let email: string;

    beforeAll(async () => {
      email = uniqueEmail('an.nguyen');
      token = (await signInWithCode(app, mailer, email)).access_token;
    });

    const complete = (body: object) =>
      http(app)
        .post('/auth/complete-account')
        .auth(token, { type: 'bearer' })
        .send(body);

    it('rejects an invalid username (AC3)', async () => {
      const res = await complete({
        ...completion('x'),
        username: 'Nez Focus!',
      }).expect(400);
      expect(res.body).toMatchObject({
        code: 40001,
        errors: { username: [{ code: 'INVALID_CHARS' }] },
      });
    });

    it('requires agreeing to the terms (AC4)', async () => {
      const res = await complete({
        ...completion(uniqueUsername()),
        terms_accepted: false,
      }).expect(400);
      expect(res.body.code).toBe(40001);
      expect(Object.keys(res.body.errors)).toEqual(['terms_accepted']);
    });

    it('lists the missing password conditions (AC4b)', async () => {
      const res = await complete({
        ...completion(uniqueUsername()),
        password: 'ontap2026',
      }).expect(400);
      expect(
        res.body.errors.password.map((e: { code: string }) => e.code),
      ).toEqual(['MISSING_UPPERCASE', 'MISSING_SPECIAL']);
    });

    it('rejects a password equal to the username or email local part (AC6)', async () => {
      const username = uniqueUsername();
      for (const password of [
        username.replace('an_', 'An_') + '',
        email.split('@')[0].replace('an', 'An'),
      ]) {
        const res = await complete({ ...completion(username), password });
        expect(res.status).toBe(400);
        expect(res.body.errors.password).toContainEqual(
          expect.objectContaining({ code: 'SAME_AS_PERSONAL_INFO' }),
        );
      }
    });

    it('answers 40901 when the username was just taken (AC2)', async () => {
      const taken = uniqueUsername();
      const other = await signInWithCode(app, mailer, uniqueEmail('binh'));
      await http(app)
        .post('/auth/complete-account')
        .auth(other.access_token, { type: 'bearer' })
        .send(completion(taken))
        .expect(200);

      await http(app)
        .get(`/auth/username-available?username=${taken}`)
        .auth(token, { type: 'bearer' })
        .expect(200, { available: false });
      const res = await complete(completion(taken)).expect(409);
      expect(res.body).toMatchObject({
        code: 40901,
        errors: { username: [{ code: 'TAKEN' }] },
      });
    });
  });

  describe('Code rules (AUTH-13)', () => {
    it('counts down wrong codes, then cancels the code (AC2)', async () => {
      const api = http(app);
      const email = uniqueEmail();
      const dev = device();
      await api
        .post('/auth/email-code')
        .send({ email, device: dev })
        .expect(200);
      const right = mailer.codes.get(email)!;
      const wrong = right === '000000' ? '111111' : '000000';

      for (const left of [4, 3, 2, 1, 0]) {
        const res = await api
          .post('/auth/email-code/verify')
          .send({ email, code: wrong, device: dev })
          .expect(400);
        expect(res.body).toMatchObject({ code: 40003, attempts_left: left });
      }
      const res = await api
        .post('/auth/email-code/verify')
        .send({ email, code: right, device: dev })
        .expect(400);
      expect(res.body.code).toBe(40002);
    });

    it('limits resends with identical answers for known and unknown emails (AC4, AC6, AUTH-01 AC7)', async () => {
      const api = http(app);
      const known = uniqueEmail();
      await signInWithCode(app, mailer, known);
      const unknown = uniqueEmail();
      await api
        .post('/auth/email-code')
        .send({ email: unknown, device: device() })
        .expect(200);

      const limited = await Promise.all(
        [known, unknown].map((email) =>
          api.post('/auth/email-code').send({ email, device: device() }),
        ),
      );
      for (const res of limited) {
        expect(res.status).toBe(429);
        expect(res.body.code).toBe(40029);
        expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
      }
      expect(withoutRequestId(limited[0].body)).toEqual(
        withoutRequestId(limited[1].body),
      );
    });

    it('cancels the old code when the device switches email (AC5)', async () => {
      const api = http(app);
      const dev = device();
      const first = uniqueEmail();
      await api
        .post('/auth/email-code')
        .send({ email: first, device: dev })
        .expect(200);
      const oldCode = mailer.codes.get(first);
      await api
        .post('/auth/email-code')
        .send({ email: uniqueEmail('binh'), device: dev })
        .expect(200);
      const res = await api
        .post('/auth/email-code/verify')
        .send({ email: first, code: oldCode, device: dev })
        .expect(400);
      expect(res.body.code).toBe(40002);
    });

    it('requires X-Client-Platform to start a session', async () => {
      const email = uniqueEmail();
      const dev = device();
      await http(app)
        .post('/auth/email-code')
        .send({ email, device: dev })
        .expect(200);
      const res = await http(app)
        .post('/auth/email-code/verify')
        .unset('X-Client-Platform')
        .send({ email, code: mailer.codes.get(email), device: dev })
        .expect(400);
      expect(res.body.errors).toHaveProperty('X-Client-Platform');
    });
  });
});
