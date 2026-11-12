import { randomInt } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { AccountRoutes, AuthRoutes } from '@nezfocus/shared';
import { KeyValueStore } from '../src/redis/key-value-store.js';
import {
  CapturingMailer,
  completion,
  connectGateway,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const OLD = completion('x').password;
const NEW = 'Moi2026!pass';
const randomIp = () => `203.0.${randomInt(0, 256)}.${randomInt(1, 255)}`;

// REQ-AUTH-08 (forgot / reset), REQ-AUTH-14 (change) through HTTP, Postgres, Redis and the
// Gateway. Needs `pnpm dev:infra`.
describe('Password reset and change (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  // A completed account with two signed-in devices: "this phone" and "the other one".
  // The email and username carry a digit, so with a capital letter they pass the format rules
  // and only the personal-info rule can refuse them.
  const account = async () => {
    const email = uniqueEmail('an1');
    const username = `an_1${uniqueUsername().slice(3, 9)}`;
    const first = await signInWithCode(app, mailer, email);
    await http(app)
      .post('/auth/complete-account')
      .auth(first.access_token, { type: 'bearer' })
      .send(completion(username))
      .expect(200);
    const other = await http(app)
      .post(AuthRoutes.login)
      .set('X-Forwarded-For', randomIp())
      .send({ email, password: OLD, device: device() })
      .expect(200);
    return {
      email,
      username,
      me: first.access_token,
      meRefresh: first.refresh_token,
      other: other.body.access_token as string,
      otherRefresh: other.body.refresh_token as string,
    };
  };

  const forgot = (email: string) =>
    http(app).post(AuthRoutes.forgotPassword).send({ email });
  const reset = (email: string, code: string, password = NEW) =>
    http(app)
      .post(AuthRoutes.resetPassword)
      .send({ email, code, password, device: device() });
  const change = (token: string, body: object) =>
    http(app)
      .post(AccountRoutes.changePassword)
      .auth(token, { type: 'bearer' })
      .send(body);
  const login = (email: string, password: string) =>
    http(app)
      .post(AuthRoutes.login)
      .set('X-Forwarded-For', randomIp())
      .send({ email, password, device: device() });
  const withoutRequestId = (body: Record<string, unknown>) => {
    const { request_id: _, ...rest } = body;
    return rest;
  };

  it('answers the same for an email with or without an account, and mails only the first (AUTH-08 AC1, AC2)', async () => {
    const { email } = await account();
    const ghost = uniqueEmail('ghost');
    const known = await forgot(email).expect(202);
    const unknown = await forgot(ghost).expect(202);
    expect(withoutRequestId(unknown.body)).toEqual(
      withoutRequestId(known.body),
    );
    expect(mailer.resetCodes.get(email)).toMatch(/^\d{6}$/);
    expect(mailer.resetCodes.has(ghost)).toBe(false);
  });

  it('resets: signs this phone in, ends the other session with 4004 password_reset, mails a notice (AUTH-08 AC4)', async () => {
    const acc = await account();
    const gw = await connectGateway(app, acc.other);
    await forgot(acc.email).expect(202);
    const res = await reset(
      acc.email,
      mailer.resetCodes.get(acc.email)!,
    ).expect(200);
    expect(res.body).toMatchObject({
      access_token: expect.any(String),
      user: { email: acc.email, account_completed: true },
    });
    expect(await gw.closed).toEqual({ code: 4004, reason: 'password_reset' });
    const refused = await http(app)
      .post(AuthRoutes.refresh)
      .send({ refresh_token: acc.otherRefresh })
      .expect(401);
    expect(refused.body).toMatchObject({
      code: 40100,
      reason: 'password_reset',
    });
    expect(mailer.passwordChanged).toContain(acc.email);
    await login(acc.email, NEW).expect(200);
    await login(acc.email, OLD).expect(401);
  });

  it('refuses a used code with 40002 and counts wrong codes down (AUTH-08 AC3, AC3b)', async () => {
    const acc = await account();
    await forgot(acc.email).expect(202);
    const code = mailer.resetCodes.get(acc.email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    const first = await reset(acc.email, wrong).expect(400);
    expect(first.body).toMatchObject({ code: 40003, attempts_left: 4 });
    await reset(acc.email, code).expect(200);
    const again = await reset(acc.email, code).expect(400);
    expect(again.body.code).toBe(40002);
  });

  it('refuses a new password that is the email, its local part or the username, and keeps the code (AUTH-08 AC6)', async () => {
    const acc = await account();
    await forgot(acc.email).expect(202);
    const code = mailer.resetCodes.get(acc.email)!;
    const capital = (x: string) => x[0]!.toUpperCase() + x.slice(1);
    for (const pw of [acc.email, acc.email.split('@')[0]!, acc.username]) {
      const res = await reset(acc.email, code, capital(pw)).expect(400);
      expect(res.body.code).toBe(40001);
      expect(res.body.errors).toEqual({
        password: [expect.objectContaining({ code: 'SAME_AS_PERSONAL_INFO' })],
      });
    }
    // A right code is not a wrong guess: after 6 of those, a wrong code still has 4 left.
    for (let i = 0; i < 3; i++)
      await reset(acc.email, code, capital(acc.username)).expect(400);
    const wrong = await reset(
      acc.email,
      code === '000000' ? '111111' : '000000',
    ).expect(400);
    expect(wrong.body).toMatchObject({ code: 40003, attempts_left: 4 });
    await reset(acc.email, code).expect(200);
  });

  it('limits reset requests to 3 an hour, also for an email without an account (AUTH-08 AC5)', async () => {
    const ghost = uniqueEmail('ghost');
    const kv = app.get(KeyValueStore);
    for (let i = 0; i < 3; i++) {
      await forgot(ghost).expect(202);
      await kv.delete(`reset-code:minute:${ghost}`);
    }
    const res = await forgot(ghost).expect(429);
    expect(res.body.code).toBe(40029);
  });

  it('never lets a reset code sign in, nor a sign-in code reset (AUTH-02 AC7)', async () => {
    const acc = await account();
    await forgot(acc.email).expect(202);
    const resetCode = mailer.resetCodes.get(acc.email)!;
    // No live sign-in code: a reset code at the sign-in step is refused.
    const signIn = await http(app)
      .post(AuthRoutes.verifyEmailCode)
      .send({ email: acc.email, code: resetCode, device: device() })
      .expect(400);
    expect([40002, 40003]).toContain(signIn.body.code);
    // The reset code still works for what it is for.
    await reset(acc.email, resetCode).expect(200);
  });

  it('changes with the current password: keeps this session, ends the others (AUTH-14 AC1)', async () => {
    const acc = await account();
    const gw = await connectGateway(app, acc.other);
    await change(acc.me, { current_password: OLD, new_password: NEW }).expect(
      204,
    );
    expect(await gw.closed).toEqual({ code: 4004, reason: 'password_reset' });
    await http(app)
      .post(AuthRoutes.refresh)
      .send({ refresh_token: acc.meRefresh })
      .expect(200);
    expect(mailer.passwordChanged).toContain(acc.email);
    await login(acc.email, NEW).expect(200);
  });

  it('refuses a wrong current password with 40102 and ends nothing; the 5th wrong try in 10 minutes is 40029 (AUTH-14 AC2, AC3)', async () => {
    const acc = await account();
    for (let i = 0; i < 4; i++) {
      const res = await change(acc.me, {
        current_password: 'Wrong2026!',
        new_password: NEW,
      }).expect(401);
      expect(res.body.code).toBe(40102);
    }
    await http(app)
      .post(AuthRoutes.refresh)
      .send({ refresh_token: acc.otherRefresh })
      .expect(200);
    const fifth = await change(acc.me, {
      current_password: 'Wrong2026!',
      new_password: NEW,
    }).expect(429);
    expect(fifth.body.code).toBe(40029);
    // Blocked even with the right password until the window ends.
    await change(acc.me, { current_password: OLD, new_password: NEW }).expect(
      429,
    );
  });

  it('refuses a new password breaking AUTH-01 with 40001 on new_password (AUTH-14 AC4)', async () => {
    const acc = await account();
    const weak = await change(acc.me, {
      current_password: OLD,
      new_password: 'weak',
    }).expect(400);
    expect(Object.keys(weak.body.errors)).toEqual(['new_password']);
    const personal = await change(acc.me, {
      current_password: OLD,
      new_password: acc.username[0]!.toUpperCase() + acc.username.slice(1),
    }).expect(400);
    expect(personal.body.errors.new_password).toContainEqual(
      expect.objectContaining({ code: 'SAME_AS_PERSONAL_INFO' }),
    );
  });

  it('changes with a reset code ("Quên mật khẩu?"): keeps this session, ends the others (AUTH-14 AC5)', async () => {
    const acc = await account();
    const gw = await connectGateway(app, acc.other);
    await forgot(acc.email).expect(202);
    const code = mailer.resetCodes.get(acc.email)!;
    await change(acc.me, { code, new_password: NEW }).expect(204);
    expect(await gw.closed).toEqual({ code: 4004, reason: 'password_reset' });
    await http(app)
      .post(AuthRoutes.refresh)
      .send({ refresh_token: acc.meRefresh })
      .expect(200);
    await login(acc.email, NEW).expect(200);
  });

  it('leaves an incomplete account incomplete after a reset (app goes to S-ONB-01)', async () => {
    const email = uniqueEmail();
    await signInWithCode(app, mailer, email);
    await forgot(email).expect(202);
    const res = await reset(email, mailer.resetCodes.get(email)!).expect(200);
    expect(res.body.user.account_completed).toBe(false);
  });
});
