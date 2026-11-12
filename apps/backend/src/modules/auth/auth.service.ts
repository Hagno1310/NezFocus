import { Injectable } from '@nestjs/common';
import {
  checkPassword,
  ErrorCode,
  suggestUsername,
  type ChangePasswordRequest,
  type CompleteAccountRequest,
  type CurrentUser,
  type DeviceInfo,
  type EmailCodeSentResponse,
  type EmailSignInResponse,
  type LoginRequest,
  type ResetPasswordRequest,
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
import { toCurrentUser } from '../users/users.dto.js';
import type { UserRow } from '../users/users.schema.js';
import { AuthMailer } from './auth-mailer.js';
import { EmailCodeService } from './email-code.service.js';
import { PasswordHasher } from './password-hasher.js';
import { SessionService, type ClientInfo } from './session.service.js';

const USERNAME_CHECKS_PER_MINUTE = 30;
const FAILS_PER_ACCOUNT_IP = 5;
const ACCOUNT_IP_WINDOW = 10 * 60;
const BLOCK_SECONDS = 10 * 60;
const FAILS_PER_IP = 20;
const IP_WINDOW = 60 * 60;
// REQ-AUTH-14 AC3 (shared by every dialog that asks for the password again): the 5th wrong
// try in 10 minutes is 40029.
const CONFIRM_FAILS = 5;
const CONFIRM_WINDOW = 10 * 60;

// A new password may not be the email, the part before @, or the username (CR-28 #9).
const personalInfoError = (
  password: string,
  user: Pick<UserRow, 'email' | 'username'>,
  field: string,
) => {
  const issues = checkPassword(password, {
    username: user.username,
    email: user.email,
  }).filter((issue) => issue === 'SAME_AS_PERSONAL_INFO');
  return issues.length
    ? new AppError(ErrorCode.ValidationError, 'Invalid request', {
        [field]: issues.map((code) => ({ code, message: code })),
      })
    : null;
};

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
    const blockKey = `login:block:${body.email}:${ip}`;
    const ipKey = `login:fail-ip:${ip}`;

    const block = await this.kv.peek(blockKey);
    if (block.count > 0) throw rateLimited(block.resetIn);

    // Each attempt takes its slot before the password is checked, so parallel requests
    // cannot slip past the limits. A success gives the slots back.
    const perIp = await this.kv.increment(ipKey, IP_WINDOW);
    if (perIp.count > FAILS_PER_IP) throw rateLimited(perIp.resetIn);
    const perPair = await this.kv.increment(pairKey, ACCOUNT_IP_WINDOW);
    if (perPair.count > FAILS_PER_ACCOUNT_IP) {
      await this.kv.decrement(ipKey);
      throw rateLimited(await this.blockPair(blockKey));
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
      // AC3: the 5th wrong try starts a full 10-minute wait.
      if (perPair.count === FAILS_PER_ACCOUNT_IP)
        await this.blockPair(blockKey);
      throw new AppError(
        ErrorCode.InvalidCredentials,
        'Wrong email or password',
      );
    }

    await this.kv.delete(pairKey);
    await this.kv.decrement(ipKey);
    const session = await this.startWithAlert(user, body.device, client);
    return { ...session, user: toCurrentUser(user) };
  }

  // Returns the seconds left on the block (an earlier parallel request may have set it).
  private async blockPair(blockKey: string) {
    const existing = await this.kv.peek(blockKey);
    if (existing.count > 0) return existing.resetIn;
    await this.kv.set(blockKey, '1', BLOCK_SECONDS);
    return BLOCK_SECONDS;
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

    const personal = personalInfoError(
      body.password,
      { email: user.email, username: body.username },
      'password',
    );
    if (personal) throw personal;

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

  // REQ-AUTH-08: the same answer for every email; only an account gets the code by mail.
  async forgotPassword(email: string): Promise<EmailCodeSentResponse> {
    const user = await this.users.findByEmail(email);
    return this.codes.sendReset(email, user !== undefined);
  }

  // REQ-AUTH-08 AC4: code + new password in one step → signed in here, every other session
  // ended, a notice mailed. The code is checked first, so nobody without it learns anything
  // about the account from the password rules.
  async resetPassword(
    body: ResetPasswordRequest,
    client: ClientInfo,
  ): Promise<SessionResponse> {
    await this.codes.verify(body.email, body.code, 'reset_password');
    const user = await this.users.findByEmail(body.email);
    if (!user) {
      await this.codes.discard(body.email, 'reset_password');
      throw new AppError(
        ErrorCode.TokenLinkInvalid,
        'Code is invalid or expired',
      );
    }
    const personal = personalInfoError(body.password, user, 'password');
    if (personal) throw personal; // the code stays for the next try

    await this.codes.discard(body.email, 'reset_password');
    await this.setPassword(user, body.password, null);
    const session = await this.startWithAlert(user, body.device, client);
    return { ...session, user: toCurrentUser(user) };
  }

  // REQ-AUTH-14: proven with the current password or a reset code; this session stays.
  async changePassword(
    userId: bigint,
    sessionId: bigint,
    body: ChangePasswordRequest,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user?.email)
      throw new AppError(ErrorCode.TokenInvalid, 'Unknown account');
    const personal = personalInfoError(body.new_password, user, 'new_password');
    if (personal) throw personal;

    if (body.code !== undefined) {
      await this.codes.verify(user.email, body.code, 'reset_password');
      await this.codes.discard(user.email, 'reset_password');
    } else await this.confirmPassword(user, body.current_password ?? '');
    await this.setPassword(user, body.new_password, sessionId);
  }

  // Every dialog that asks for the password again (AUTH-14, SRV-05 transfer, AUTH-10 delete)
  // shares one counter: wrong → 40102, the 5th wrong try in 10 minutes → 40029, and the
  // block holds until the window ends, even for the right password.
  async confirmPassword(user: UserRow, password: string): Promise<void> {
    const key = `password-confirm:fail:${user.id}`;
    const before = await this.kv.peek(key);
    if (before.count >= CONFIRM_FAILS) throw rateLimited(before.resetIn);
    const valid =
      user.passwordHash !== null &&
      (await this.hasher.verify(user.passwordHash, password));
    if (valid) return;
    const after = await this.kv.increment(key, CONFIRM_WINDOW);
    if (after.count >= CONFIRM_FAILS) throw rateLimited(after.resetIn);
    throw new AppError(ErrorCode.InvalidCredentials, 'Wrong password');
  }

  private async setPassword(
    user: UserRow,
    password: string,
    keep: bigint | null,
  ) {
    await this.users.setPasswordHash(
      user.id,
      await this.hasher.hash(password),
      this.clock.now(),
    );
    await this.sessions.revokeOthers(user.id, keep, 'password_reset');
    if (user.email) await this.mailer.sendPasswordChanged(user.email);
  }
}
