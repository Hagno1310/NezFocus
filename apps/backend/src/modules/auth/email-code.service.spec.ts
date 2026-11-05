import { ErrorCode } from '@nezfocus/shared';
import { fixedClock } from '../../common/clock.js';
import { MemoryKeyValueStore } from '../../redis/key-value-store.js';
import type { AuthMailer } from './auth-mailer.js';
import type { EmailCodeRow } from './auth.schema.js';
import type { EmailCodeRepository } from './email-code.repository.js';
import { EmailCodeService, hashEmailCode } from './email-code.service.js';

const fakeRepo = () => {
  const rows = new Map<string, EmailCodeRow>();
  const key = (email: string, purpose: string) => `${email}|${purpose}`;
  const repo = {
    upsert: async (r: Omit<EmailCodeRow, 'attempts' | 'createdAt'>) => {
      rows.set(key(r.email, r.purpose), {
        ...r,
        attempts: 0,
        createdAt: new Date(),
      });
    },
    // Mirrors the single UPDATE … WHERE attempts < max AND expires_at > now.
    reserveAttempt: async (
      email: string,
      purpose: string,
      max: number,
      now: Date,
    ) => {
      const row = rows.get(key(email, purpose));
      if (!row || row.attempts >= max || row.expiresAt <= now) return undefined;
      row.attempts += 1;
      return { attempts: row.attempts, codeHash: row.codeHash };
    },
    delete: async (email: string, purpose: string) => {
      rows.delete(key(email, purpose));
    },
  };
  return { repo: repo as unknown as EmailCodeRepository, rows };
};

const setup = () => {
  const clock = fixedClock();
  const { repo, rows } = fakeRepo();
  const sent: { email: string; code: string }[] = [];
  const mailer = {
    sendSignInCode: async (email: string, code: string) => {
      sent.push({ email, code });
    },
  } as unknown as AuthMailer;
  const service = new EmailCodeService(
    repo,
    new MemoryKeyValueStore(clock),
    mailer,
    clock,
  );
  const lastCode = () => sent.at(-1)!.code;
  return { service, clock, sent, rows, lastCode };
};

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => e,
  );

const AN = 'an@gmail.com';
const PHONE = 'device-an';

describe('EmailCodeService', () => {
  it('emails a 6-digit code and answers with the timers (AUTH-01 AC1)', async () => {
    const { service, sent } = setup();
    await expect(service.send(AN, PHONE)).resolves.toEqual({
      expires_in: 900,
      resend_in: 60,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].code).toMatch(/^\d{6}$/);
  });

  it('stores only a hash of the code', async () => {
    const { service, rows, lastCode } = setup();
    await service.send(AN, PHONE);
    const row = [...rows.values()][0];
    expect(row.codeHash).not.toContain(lastCode());
  });

  it('accepts the right code within 15 minutes, once (AUTH-13 AC1)', async () => {
    const { service, clock, lastCode } = setup();
    await service.send(AN, PHONE);
    clock.advance(14 * 60);
    await expect(service.consume(AN, lastCode())).resolves.toBeUndefined();
    const again = await errorOf(service.consume(AN, lastCode()));
    expect(again).toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('counts down wrong attempts, then cancels the code (AUTH-13 AC2)', async () => {
    const { service, lastCode } = setup();
    await service.send(AN, PHONE);
    const wrong = lastCode() === '000000' ? '111111' : '000000';
    for (let left = 4; left >= 0; left--) {
      const err = await errorOf(service.consume(AN, wrong));
      expect(err).toMatchObject({
        code: ErrorCode.VerificationCodeInvalid,
        details: { attemptsLeft: left },
      });
    }
    const after = await errorOf(service.consume(AN, lastCode()));
    expect(after).toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('rejects a code older than 15 minutes (AUTH-13 AC3)', async () => {
    const { service, clock, lastCode } = setup();
    await service.send(AN, PHONE);
    clock.advance(15 * 60 + 1);
    const err = await errorOf(service.consume(AN, lastCode()));
    expect(err).toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('rejects a code when none was sent', async () => {
    const { service } = setup();
    const err = await errorOf(service.consume(AN, '123456'));
    expect(err).toMatchObject({ code: ErrorCode.TokenLinkInvalid });
  });

  it('allows one send per minute per email (AUTH-13 AC4)', async () => {
    const { service, clock } = setup();
    await service.send(AN, PHONE);
    clock.advance(30);
    const err = await errorOf(service.send(AN, PHONE));
    expect(err).toMatchObject({
      code: ErrorCode.RateLimited,
      details: { retryAfter: 30 },
    });
    clock.advance(30);
    await expect(service.send(AN, PHONE)).resolves.toBeDefined();
  });

  it('invalidates the old code when the same device switches email (AUTH-13 AC5)', async () => {
    const { service, lastCode } = setup();
    await service.send(AN, PHONE);
    const oldCode = lastCode();
    await service.send('binh@gmail.com', PHONE);
    const err = await errorOf(service.consume(AN, oldCode));
    expect(err).toMatchObject({ code: ErrorCode.TokenLinkInvalid });
    await expect(
      service.consume('binh@gmail.com', lastCode()),
    ).resolves.toBeUndefined();
  });

  it('keeps another device’s code for the same email', async () => {
    const { service, clock, lastCode } = setup();
    await service.send(AN, PHONE);
    const code = lastCode();
    clock.advance(10);
    await service.send('binh@gmail.com', 'device-binh');
    await expect(service.consume(AN, code)).resolves.toBeUndefined();
  });

  it('allows 10 sends a day per email, for any email (AUTH-13 AC6, AUTH-01 AC7)', async () => {
    const { service, clock, sent } = setup();
    for (let i = 0; i < 10; i++) {
      await service.send(AN, PHONE);
      clock.advance(61);
    }
    const err = await errorOf(service.send(AN, PHONE));
    expect(err).toMatchObject({ code: ErrorCode.RateLimited });
    expect(sent).toHaveLength(10);
  });
});

describe('EmailCodeService code purposes', () => {
  it('rejects a password-reset code at the sign-in step like a wrong code (AUTH-02 AC7)', async () => {
    const { service, rows, clock, lastCode } = setup();
    await service.send(AN, PHONE);
    const resetCode = lastCode() === '424242' ? '434343' : '424242';
    rows.set(`${AN}|reset_password`, {
      email: AN,
      purpose: 'reset_password',
      codeHash: hashEmailCode(AN, resetCode),
      expiresAt: new Date(clock.now().getTime() + 15 * 60 * 1000),
      attempts: 0,
      createdAt: clock.now(),
    });
    const err = await errorOf(service.consume(AN, resetCode));
    expect(err).toMatchObject({ code: ErrorCode.VerificationCodeInvalid });
  });
});

describe('EmailCodeService under parallel guesses', () => {
  it('compares at most 5 guesses even when they arrive together (AUTH-13 AC2)', async () => {
    const { service, lastCode } = setup();
    await service.send(AN, PHONE);
    const right = lastCode();
    const guesses = Array.from({ length: 20 }, (_, i) =>
      String(i).padStart(6, '0') === right
        ? '999999'
        : String(i).padStart(6, '0'),
    );
    const results = await Promise.all(
      guesses.map((g) => errorOf(service.consume(AN, g))),
    );
    const compared = results.filter(
      (e) =>
        (e as { code?: number }).code === ErrorCode.VerificationCodeInvalid,
    );
    expect(compared).toHaveLength(5);
  });
});
