import { Injectable } from '@nestjs/common';
import {
  checkPassword,
  ErrorCode,
  suggestUsername,
  type CompleteAccountRequest,
  type CurrentUser,
  type DeviceInfo,
  type EmailSignInResponse,
  type LoginRequest,
  type SessionResponse,
  type UsernameAvailableResponse,
  type VerifyEmailCodeRequest,
} from '@nezfocus/shared';
import { AppError, rateLimited } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import {
  UsernameTakenError,
  UsersRepository,
} from '../users/users.repository.js';
import type { UserRow } from '../users/users.schema.js';
import { AuthMailer } from './auth-mailer.js';
import { EmailCodeService } from './email-code.service.js';
import { PasswordHasher } from './password-hasher.js';
import { SessionService, type ClientInfo } from './session.service.js';

const USERNAME_CHECKS_PER_MINUTE = 30;
const FAILS_PER_ACCOUNT_IP = 5;
const ACCOUNT_IP_WINDOW = 10 * 60;
const FAILS_PER_IP = 20;
const IP_WINDOW = 60 * 60;

export const toCurrentUser = (row: UserRow): CurrentUser => ({
  id: row.id.toString(),
  email: row.email ?? '',
  username: row.username,
  display_name: row.displayName,
  account_completed: row.accountCompletedAt !== null,
  created_at: row.createdAt.toISOString(),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly codes: EmailCodeService,
    private readonly users: UsersRepository,
    private readonly sessions: SessionService,
    private readonly hasher: PasswordHasher,
    private readonly kv: KeyValueStore,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly mailer: AuthMailer,
  ) {}

  private dummyHash?: Promise<string>;

  // REQ-AUTH-01/13: right code → new account (email verified) or sign-in to the existing one.
  async verifyEmailCode(
    body: VerifyEmailCodeRequest,
    client: ClientInfo,
  ): Promise<EmailSignInResponse> {
    await this.codes.consume(body.email, body.code);
    const existing = await this.users.findByEmail(body.email);
    const user =
      existing ??
      (await this.users.createVerified({
        id: this.ids.next(),
        email: body.email,
        now: this.clock.now(),
      }));
    const session = existing
      ? await this.startWithAlert(existing, body.device, client)
      : await this.sessions.start(user.id, body.device, client);
    return {
      ...session,
      user: toCurrentUser(user),
      suggested_username: user.accountCompletedAt
        ? null
        : suggestUsername(body.email),
    };
  }

  // REQ-AUTH-02. No account lockout: limits are per (account, IP) and per IP, never per account alone.
  async login(
    body: LoginRequest,
    client: ClientInfo,
  ): Promise<SessionResponse> {
    const ip = client.ip ?? 'unknown';
    const pairKey = `login:fail:${body.email}:${ip}`;
    const ipKey = `login:fail-ip:${ip}`;
    for (const [key, limit] of [
      [pairKey, FAILS_PER_ACCOUNT_IP],
      [ipKey, FAILS_PER_IP],
    ] as const) {
      const window = await this.kv.peek(key);
      if (window.count >= limit) throw rateLimited(window.resetIn);
    }

    const user = await this.users.findByEmail(body.email);
    // Hash even when there is nothing to compare, so timing does not reveal registered emails.
    const valid = user?.passwordHash
      ? await this.hasher.verify(user.passwordHash, body.password)
      : await this.hasher
          .verify(
            await (this.dummyHash ??= this.hasher.hash('no-such-account')),
            body.password,
          )
          .then(() => false);
    if (!user || !valid) {
      await this.kv.increment(pairKey, ACCOUNT_IP_WINDOW);
      await this.kv.increment(ipKey, IP_WINDOW);
      throw new AppError(
        ErrorCode.InvalidCredentials,
        'Wrong email or password',
      );
    }

    await this.kv.delete(pairKey);
    const session = await this.startWithAlert(user, body.device, client);
    return { ...session, user: toCurrentUser(user) };
  }

  private async startWithAlert(
    user: UserRow,
    device: DeviceInfo,
    client: ClientInfo,
  ) {
    const known = await this.sessions.isKnownDevice(user.id, device.id);
    const session = await this.sessions.start(user.id, device, client);
    if (!known && user.email)
      await this.mailer.sendNewDeviceAlert(user.email, {
        name: device.name,
        platform: client.platform,
      });
    return session;
  }

  // REQ-AUTH-01 Complete account. Format rules were checked by the request schema.
  async completeAccount(
    userId: bigint,
    body: CompleteAccountRequest,
  ): Promise<CurrentUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError(ErrorCode.TokenInvalid, 'Unknown account');
    if (user.accountCompletedAt)
      throw new AppError(ErrorCode.Conflict, 'Account already completed');

    const personal = checkPassword(body.password, {
      username: body.username,
      email: user.email,
    }).filter((issue) => issue === 'SAME_AS_PERSONAL_INFO');
    if (personal.length)
      throw new AppError(ErrorCode.ValidationError, 'Invalid request', {
        password: personal.map((code) => ({ code, message: code })),
      });

    try {
      const completed = await this.users.complete(userId, {
        username: body.username,
        displayName: body.display_name,
        passwordHash: await this.hasher.hash(body.password),
        termsVersion: body.terms_version,
        timezone: body.timezone,
        locale: body.locale,
        now: this.clock.now(),
      });
      if (!completed)
        throw new AppError(ErrorCode.Conflict, 'Account already completed');
      return toCurrentUser(completed);
    } catch (err) {
      if (!(err instanceof UsernameTakenError)) throw err;
      throw new AppError(ErrorCode.Conflict, 'Username already taken', {
        username: [{ code: 'TAKEN', message: 'Username already taken' }],
      });
    }
  }

  // A hint while typing; completeAccount checks again.
  async usernameAvailable(
    userId: bigint,
    username: string,
  ): Promise<UsernameAvailableResponse> {
    const window = await this.kv.increment(`username-check:${userId}`, 60);
    if (window.count > USERNAME_CHECKS_PER_MINUTE)
      throw rateLimited(window.resetIn);
    return { available: !(await this.users.usernameExists(username)) };
  }
}
