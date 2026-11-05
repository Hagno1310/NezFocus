import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  EMAIL_CODE_RESEND_SECONDS,
  EMAIL_CODE_TTL_SECONDS,
  ErrorCode,
  type EmailCodeSentResponse,
} from '@nezfocus/shared';
import { AppError, rateLimited } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import { AuthMailer } from './auth-mailer.js';
import { EmailCodeRepository } from './email-code.repository.js';

const MAX_WRONG_ATTEMPTS = 5;
const MAX_SENDS_PER_DAY = 10;
const DAY = 24 * 60 * 60;

export const hashEmailCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex');

const codeInvalid = () =>
  new AppError(ErrorCode.TokenLinkInvalid, 'Code is invalid or expired');

// REQ-AUTH-13 sign-in codes. Never looks at `users`: the same answers and limits apply to
// every email, so nothing reveals which emails have an account (AUTH-01 AC2b, AC7).
@Injectable()
export class EmailCodeService {
  constructor(
    private readonly codes: EmailCodeRepository,
    private readonly kv: KeyValueStore,
    private readonly mailer: AuthMailer,
    private readonly clock: Clock,
  ) {}

  async send(email: string, deviceId: string): Promise<EmailCodeSentResponse> {
    const minute = await this.kv.increment(
      `email-code:minute:${email}`,
      EMAIL_CODE_RESEND_SECONDS,
    );
    if (minute.count > 1) throw rateLimited(minute.resetIn);
    const day = await this.kv.increment(`email-code:day:${email}`, DAY);
    if (day.count > MAX_SENDS_PER_DAY) throw rateLimited(day.resetIn);

    // AUTH-13 AC5: switching email on the same device cancels the previous email's code.
    const deviceKey = `email-code:device:${deviceId}`;
    const previous = await this.kv.get(deviceKey);
    if (previous && previous !== email)
      await this.codes.delete(previous, 'sign_in');
    await this.kv.set(deviceKey, email, EMAIL_CODE_TTL_SECONDS);

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.codes.upsert({
      email,
      purpose: 'sign_in',
      codeHash: hashEmailCode(email, code),
      expiresAt: new Date(
        this.clock.now().getTime() + EMAIL_CODE_TTL_SECONDS * 1000,
      ),
    });
    await this.mailer.sendSignInCode(email, code);
    return {
      expires_in: EMAIL_CODE_TTL_SECONDS,
      resend_in: EMAIL_CODE_RESEND_SECONDS,
    };
  }

  // Resolves once for the right code; the code is gone afterwards.
  async consume(email: string, code: string): Promise<void> {
    const row = await this.codes.find(email, 'sign_in');
    if (!row) throw codeInvalid();
    if (
      row.expiresAt <= this.clock.now() ||
      row.attempts >= MAX_WRONG_ATTEMPTS
    ) {
      await this.codes.delete(email, 'sign_in');
      throw codeInvalid();
    }

    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(hashEmailCode(email, code), 'hex');
    if (timingSafeEqual(expected, actual)) {
      await this.codes.delete(email, 'sign_in');
      return;
    }

    const attempts = await this.codes.addAttempt(email, 'sign_in');
    const attemptsLeft = Math.max(0, MAX_WRONG_ATTEMPTS - attempts);
    if (attemptsLeft === 0) await this.codes.delete(email, 'sign_in');
    throw new AppError(
      ErrorCode.VerificationCodeInvalid,
      'Wrong code',
      undefined,
      { attemptsLeft },
    );
  }
}
