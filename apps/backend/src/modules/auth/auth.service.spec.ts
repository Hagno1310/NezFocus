import {
  ErrorCode,
  TERMS_VERSION,
  type CompleteAccountRequest,
} from '@nezfocus/shared';
import { fixedClock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { MemoryKeyValueStore } from '../../redis/key-value-store.js';
import {
  UsernameTakenError,
  type CompletedAccount,
  type UsersRepository,
} from '../users/users.repository.js';
import type { UserRow } from '../users/users.schema.js';
import { AuthService } from './auth.service.js';
import type { EmailCodeService } from './email-code.service.js';
import type { PasswordHasher } from './password-hasher.js';
import type { SessionService } from './session.service.js';

const fakeUsers = () => {
  const rows = new Map<
    bigint,
    UserRow & { timezone?: string; locale?: string }
  >();
  const repo = {
    findById: async (id: bigint) => rows.get(id),
    findByEmail: async (email: string) =>
      [...rows.values()].find((u) => u.email === email),
    createVerified: async ({
      id,
      email,
      now,
    }: {
      id: bigint;
      email: string;
      now: Date;
    }) => {
      const row = {
        id,
        email,
        username: null,
        passwordHash: null,
        displayName: null,
        avatarKey: null,
        accountStatus: 'active',
        emailVerifiedAt: now,
        termsVersion: null,
        termsAcceptedAt: null,
        accountCompletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(id, row);
      return row;
    },
    usernameExists: async (username: string) =>
      [...rows.values()].some((u) => u.username === username),
    complete: async (id: bigint, input: CompletedAccount) => {
      const row = rows.get(id)!;
      if (row.accountCompletedAt) return undefined;
      if ([...rows.values()].some((u) => u.username === input.username))
        throw new UsernameTakenError();
      Object.assign(row, {
        username: input.username,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        termsVersion: input.termsVersion,
        termsAcceptedAt: input.now,
        accountCompletedAt: input.now,
        timezone: input.timezone,
        locale: input.locale,
      });
      return row;
    },
  };
  return { repo: repo as unknown as UsersRepository, rows };
};

const setup = () => {
  const clock = fixedClock();
  const users = fakeUsers();
  const started: { userId: bigint; deviceId: string }[] = [];
  const codes = {
    consume: async () => undefined,
  } as unknown as EmailCodeService;
  const sessions = {
    start: async (userId: bigint, device: { id: string }) => {
      started.push({ userId, deviceId: device.id });
      return {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 900,
        session_id: '1',
      };
    },
  } as unknown as SessionService;
  const hasher = {
    hash: async (p: string) => `hashed:${p}`,
  } as unknown as PasswordHasher;
  const service = new AuthService(
    codes,
    users.repo,
    sessions,
    hasher,
    new MemoryKeyValueStore(clock),
    new SnowflakeGenerator(0, () => clock.now().getTime()),
    clock,
  );
  return { service, users, started, clock };
};

const client = { platform: 'android' as const, ip: '10.0.0.7' };
const device = { id: 'device-an', name: 'Pixel 7' };

const completion: CompleteAccountRequest = {
  display_name: 'An Nguyễn',
  username: 'an.nguyen',
  password: 'Ontap2026!',
  timezone: 'Asia/Ho_Chi_Minh',
  locale: 'vi',
  age_confirmed: true,
  terms_accepted: true,
  terms_version: TERMS_VERSION,
};

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => e,
  );

describe('AuthService.verifyEmailCode', () => {
  it('creates an incomplete account for a new email and signs in (AUTH-01 AC1, AUTH-13 AC1)', async () => {
    const { service, users, started } = setup();
    const res = await service.verifyEmailCode(
      { email: 'an.nguyen@gmail.com', code: '123456', device },
      client,
    );
    expect(users.rows.size).toBe(1);
    expect(res.user).toMatchObject({
      email: 'an.nguyen@gmail.com',
      username: null,
      account_completed: false,
    });
    expect(res.suggested_username).toBe('an.nguyen');
    expect(res).toMatchObject({ access_token: 'access', session_id: '1' });
    expect(started).toHaveLength(1);
  });

  it('signs in to the existing account for a known email (AUTH-01 AC2b)', async () => {
    const { service, users } = setup();
    const first = await service.verifyEmailCode(
      { email: 'an@gmail.com', code: '123456', device },
      client,
    );
    const second = await service.verifyEmailCode(
      { email: 'an@gmail.com', code: '654321', device },
      client,
    );
    expect(users.rows.size).toBe(1);
    expect(second.user.id).toBe(first.user.id);
  });

  it('does not suggest a username once the account is completed', async () => {
    const { service } = setup();
    const first = await service.verifyEmailCode(
      { email: 'an@gmail.com', code: '123456', device },
      client,
    );
    await service.completeAccount(BigInt(first.user.id), completion);
    const again = await service.verifyEmailCode(
      { email: 'an@gmail.com', code: '123456', device },
      client,
    );
    expect(again.user.account_completed).toBe(true);
    expect(again.suggested_username).toBeNull();
  });
});

describe('AuthService.completeAccount (AUTH-01)', () => {
  const signUp = async (
    s: ReturnType<typeof setup>,
    email = 'an@gmail.com',
  ) => {
    const res = await s.service.verifyEmailCode(
      { email, code: '123456', device },
      client,
    );
    return BigInt(res.user.id);
  };

  it('completes the account and stores terms, time zone and language', async () => {
    const s = setup();
    const id = await signUp(s);
    const user = await s.service.completeAccount(id, completion);
    expect(user).toMatchObject({
      username: 'an.nguyen',
      display_name: 'An Nguyễn',
      account_completed: true,
    });
    expect(s.users.rows.get(id)).toMatchObject({
      passwordHash: 'hashed:Ontap2026!',
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: s.clock.now(),
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
    });
  });

  it('rejects a password that is the username, email or local part (AC6)', async () => {
    const s = setup();
    const id = await signUp(s, 'an.nguyen2026@gmail.com');
    for (const password of [
      'An.nguyen',
      'An.Nguyen2026',
      'An.nguyen2026@gmail.com',
    ]) {
      const err = await errorOf(
        s.service.completeAccount(id, { ...completion, password }),
      );
      expect(err).toMatchObject({
        code: ErrorCode.ValidationError,
        errors: { password: [{ code: 'SAME_AS_PERSONAL_INFO' }] },
      });
    }
  });

  it('accepts a password that only contains the username (AC6)', async () => {
    const s = setup();
    const id = await signUp(s);
    await expect(
      s.service.completeAccount(id, { ...completion, password: 'An.nguyen!9' }),
    ).resolves.toMatchObject({ account_completed: true });
  });

  it('answers 40901 on the username field when it was just taken (AC2)', async () => {
    const s = setup();
    await s.service.completeAccount(await signUp(s), completion);
    const other = await signUp(s, 'binh@gmail.com');
    const err = await errorOf(s.service.completeAccount(other, completion));
    expect(err).toMatchObject({
      code: ErrorCode.Conflict,
      errors: { username: [{ code: 'TAKEN' }] },
    });
  });

  it('refuses to complete twice', async () => {
    const s = setup();
    const id = await signUp(s);
    await s.service.completeAccount(id, completion);
    const err = await errorOf(
      s.service.completeAccount(id, { ...completion, username: 'an.khac' }),
    );
    expect(err).toMatchObject({ code: ErrorCode.Conflict });
  });
});

describe('AuthService.usernameAvailable', () => {
  it('reports whether the username is free', async () => {
    const s = setup();
    const id = BigInt(
      (
        await s.service.verifyEmailCode(
          { email: 'an@gmail.com', code: '123456', device },
          client,
        )
      ).user.id,
    );
    await expect(s.service.usernameAvailable(id, 'an.nguyen')).resolves.toEqual(
      {
        available: true,
      },
    );
    await s.service.completeAccount(id, completion);
    await expect(s.service.usernameAvailable(id, 'an.nguyen')).resolves.toEqual(
      {
        available: false,
      },
    );
  });

  it('is rate limited to 30 checks a minute per user', async () => {
    const s = setup();
    for (let i = 0; i < 30; i++)
      await s.service.usernameAvailable(1n, `an${i}`);
    const err = await errorOf(s.service.usernameAvailable(1n, 'an.last'));
    expect(err).toMatchObject({ code: ErrorCode.RateLimited });
  });
});
