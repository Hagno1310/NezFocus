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
import {
  EmailCodeRepository,
  type EmailCodePurpose,
} from './email-code.repository.js';

const MAX_WRONG_ATTEMPTS = 5;
const MAX_SENDS_PER_DAY = 10;
const DAY = 24 * 60 * 60;
const MAX_RESETS_PER_HOUR = 3; // REQ-AUTH-08 AC5
const HOUR = 60 * 60;

export const hashEmailCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex');

const codeInvalid = () =>
  new AppError(ErrorCode.TokenLinkInvalid, 'Code is invalid or expired');

// REQ-AUTH-13 sign-in codes and REQ-AUTH-08 password-reset codes, one row per purpose: a
// code of one purpose never passes for the other (AUTH-02 AC7). Never looks at `users`: the
// same answers and limits apply to every email, so nothing reveals which emails have an
// account (AUTH-01 AC2b, AC7; AUTH-08 AC2, AC5).
@Injectable()
export class EmailCodeService {
  constructor(
    private readonly codes: EmailCodeRepository,
    private readonly kv: KeyValueStore,
    private readonly mailer: AuthMailer,
    private readonly clock: Clock,
  ) {}

  async send(email: string, deviceId: string): Promise<EmailCodeSentResponse> {
    await this.limit(
      `email-code:minute:${email}`,
      EMAIL_CODE_RESEND_SECONDS,
      1,
    );
    await this.limit(`email-code:day:${email}`, DAY, MAX_SENDS_PER_DAY);

    // AUTH-13 AC5: switching email on the same device cancels the previous email's code.
    const deviceKey = `email-code:device:${deviceId}`;
    const previous = await this.kv.get(deviceKey);
    if (previous && previous !== email)
      await this.codes.delete(previous, 'sign_in');
    await this.kv.set(deviceKey, email, EMAIL_CODE_TTL_SECONDS);

    const code = await this.issue(email, 'sign_in');
    await this.mailer.sendSignInCode(email, code);
    return this.timers();
  }

  // REQ-AUTH-08: `deliver` is false when the email has no account; the code is still stored
  // and the limits still count, so the answer stays the same.
  async sendReset(
    email: string,
    deliver: boolean,
  ): Promise<EmailCodeSentResponse> {
    await this.limit(
      `reset-code:minute:${email}`,
      EMAIL_CODE_RESEND_SECONDS,
      1,
    );
    await this.limit(`reset-code:hour:${email}`, HOUR, MAX_RESETS_PER_HOUR);
    const code = await this.issue(email, 'reset_password');
    if (deliver) await this.mailer.sendPasswordResetCode(email, code);
    return this.timers();
  }

  // Resolves once for the right code; the code is gone afterwards.
  async consume(
    email: string,
    code: string,
    purpose: EmailCodePurpose = 'sign_in',
  ): Promise<void> {
    await this.verify(email, code, purpose);
    await this.discard(email, purpose);
  }

  // Checks the code without spending it, for a caller that may still refuse the request
  // (a new password breaking a rule keeps the code for the next try). Each call is a guess.
  async verify(
    email: string,
    code: string,
    purpose: EmailCodePurpose,
  ): Promise<void> {
    const attempt = await this.codes.reserveAttempt(
      email,
      purpose,
      MAX_WRONG_ATTEMPTS,
      this.clock.now(),
    );
    if (!attempt) {
      // Expired or used up: clear it so the next send starts clean.
      await this.codes.delete(email, purpose);
      throw codeInvalid();
    }

    const expected = Buffer.from(attempt.codeHash, 'hex');
    const actual = Buffer.from(hashEmailCode(email, code), 'hex');
    if (timingSafeEqual(expected, actual)) return;

    const attemptsLeft = Math.max(0, MAX_WRONG_ATTEMPTS - attempt.attempts);
    if (attemptsLeft === 0) await this.codes.delete(email, purpose);
    throw new AppError(
      ErrorCode.VerificationCodeInvalid,
      'Wrong code',
      undefined,
      { attemptsLeft },
    );
  }

  discard(email: string, purpose: EmailCodePurpose) {
    return this.codes.delete(email, purpose);
  }

  private async limit(key: string, windowSeconds: number, max: number) {
    const window = await this.kv.increment(key, windowSeconds);
    if (window.count > max) throw rateLimited(window.resetIn);
  }

  private async issue(email: string, purpose: EmailCodePurpose) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.codes.upsert({
      email,
      purpose,
      codeHash: hashEmailCode(email, code),
      expiresAt: new Date(
        this.clock.now().getTime() + EMAIL_CODE_TTL_SECONDS * 1000,
      ),
    });
    return code;
  }

  private timers(): EmailCodeSentResponse {
    return {
      expires_in: EMAIL_CODE_TTL_SECONDS,
      resend_in: EMAIL_CODE_RESEND_SECONDS,
    };
  }
}
