import { ErrorCode } from '@nezfocus/shared';
import { fixedClock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import type { SessionRevoker } from '../gateway/session-revoker.js';
import type {
  NewRefreshToken,
  NewSession,
  SessionRepository,
} from './session.repository.js';
import { ipPrefix, SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

const fakeRepo = () => {
  const sessions = new Map<
    bigint,
    NewSession & { revokedAt: Date | null; revokeReason: string | null }
  >();
  const tokens = new Map<
    string,
    { sessionId: bigint; expiresAt: Date; usedAt: Date | null }
  >();
  const repo = {
    create: async (s: NewSession, r: NewRefreshToken) => {
      sessions.set(s.id, { ...s, revokedAt: null, revokeReason: null });
      tokens.set(r.tokenHash.toString('hex'), {
        sessionId: s.id,
        expiresAt: r.expiresAt,
        usedAt: null,
      });
    },
    findRefreshToken: async (hash: Buffer) => {
      const t = tokens.get(hash.toString('hex'));
      if (!t) return undefined;
      const s = sessions.get(t.sessionId)!;
      return {
        ...t,
        userId: s.userId,
        revokedAt: s.revokedAt,
        revokeReason: s.revokeReason,
      };
    },
    rotate: async (oldHash: Buffer, next: NewRefreshToken, now: Date) => {
      const t = tokens.get(oldHash.toString('hex'))!;
      if (t.usedAt) return false;
      t.usedAt = now;
      tokens.set(next.tokenHash.toString('hex'), {
        sessionId: t.sessionId,
        expiresAt: next.expiresAt,
        usedAt: null,
      });
      return true;
    },
    revoke: async (sessionId: bigint, reason: string, now: Date) => {
      const s = sessions.get(sessionId)!;
      if (!s.revokedAt)
        Object.assign(s, { revokedAt: now, revokeReason: reason });
    },
    hasDeviceSession: async (userId: bigint, deviceId: string) =>
      [...sessions.values()].some(
        (s) => s.userId === userId && s.deviceId === deviceId,
      ),
  };
  return { repo: repo as unknown as SessionRepository, sessions };
};

const setup = () => {
  const clock = fixedClock();
  const { repo, sessions } = fakeRepo();
  const disconnected: { sessionId: bigint; reason: string }[] = [];
  const revoker = {
    disconnect: async (sessionId: bigint, reason: string) => {
      disconnected.push({ sessionId, reason });
    },
  } as unknown as SessionRevoker;
  const tokens = new TokenService(
    { getOrThrow: () => 'unit-test-secret-0123456789abcdef0123' } as never,
    clock,
  );
  const service = new SessionService(
    repo,
    tokens,
    new SnowflakeGenerator(0, () => clock.now().getTime()),
    clock,
    revoker,
  );
  return { service, clock, sessions, disconnected, tokens };
};

const client = { platform: 'android' as const, ip: '203.0.113.42' };
const device = { id: 'device-an', name: 'Pixel 7' };

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => e,
  );

describe('SessionService', () => {
  it('starts a session with a 15-minute access token and records the device (AUTH-02 AC1)', async () => {
    const { service, sessions, tokens } = setup();
    const s = await service.start(7n, device, client);
    expect(s.expires_in).toBe(900);
    await expect(tokens.verifyAccess(s.access_token)).resolves.toEqual({
      userId: 7n,
      sessionId: BigInt(s.session_id),
    });
    expect(sessions.get(BigInt(s.session_id))).toMatchObject({
      deviceId: 'device-an',
      platform: 'android',
      ipPrefix: '203.0.113.0',
    });
  });

  it('rejects the access token after 15 minutes', async () => {
    const { service, clock, tokens } = setup();
    const s = await service.start(7n, device, client);
    clock.advance(15 * 60 + 1);
    const err = await errorOf(tokens.verifyAccess(s.access_token));
    expect(err).toMatchObject({ code: ErrorCode.TokenInvalid });
  });

  it('rotates an unused refresh token (AUTH-04 AC1)', async () => {
    const { service } = setup();
    const s = await service.start(7n, device, client);
    const next = await service.refresh(s.refresh_token);
    expect(next.refresh_token).not.toBe(s.refresh_token);
    await expect(service.refresh(next.refresh_token)).resolves.toBeDefined();
  });

  it('revokes the whole family when a used token comes back (AUTH-04 AC2)', async () => {
    const { service, disconnected } = setup();
    const s = await service.start(7n, device, client);
    const next = await service.refresh(s.refresh_token);

    const reused = await errorOf(service.refresh(s.refresh_token));
    expect(reused).toMatchObject({
      code: ErrorCode.RefreshTokenReused,
      details: { reason: 'reuse_detected' },
    });
    expect(disconnected).toEqual([
      { sessionId: BigInt(s.session_id), reason: 'reuse_detected' },
    ]);

    const newest = await errorOf(service.refresh(next.refresh_token));
    expect(newest).toMatchObject({ code: ErrorCode.RefreshTokenReused });
  });

  it('answers 40100 for an expired refresh token (AUTH-04 AC3)', async () => {
    const { service, clock } = setup();
    const s = await service.start(7n, device, client);
    clock.advance(30 * 24 * 60 * 60 + 1);
    const err = await errorOf(service.refresh(s.refresh_token));
    expect(err).toMatchObject({ code: ErrorCode.TokenInvalid, details: {} });
  });

  it('answers 40100 for an unknown refresh token', async () => {
    const { service } = setup();
    const err = await errorOf(service.refresh('nope'));
    expect(err).toMatchObject({ code: ErrorCode.TokenInvalid });
  });

  it('tells why a revoked session ended (CR-28 #11)', async () => {
    const { service, sessions, clock } = setup();
    const s = await service.start(7n, device, client);
    await service.revoke(BigInt(s.session_id), 'password_reset');
    expect(sessions.get(BigInt(s.session_id))?.revokedAt).toEqual(clock.now());
    const err = await errorOf(service.refresh(s.refresh_token));
    expect(err).toMatchObject({
      code: ErrorCode.TokenInvalid,
      details: { reason: 'password_reset' },
    });
  });

  it('knows whether a device has signed in to the account before', async () => {
    const { service } = setup();
    expect(await service.isKnownDevice(7n, 'device-an')).toBe(false);
    await service.start(7n, device, client);
    expect(await service.isKnownDevice(7n, 'device-an')).toBe(true);
    expect(await service.isKnownDevice(8n, 'device-an')).toBe(false);
  });
});

describe('ipPrefix (NFR-PRIV-02)', () => {
  it('keeps the network part only', () => {
    expect(ipPrefix('203.0.113.42')).toBe('203.0.113.0');
    expect(ipPrefix('::ffff:10.1.2.3')).toBe('10.1.2.0');
    expect(ipPrefix('2001:db8:abcd:12::1')).toBe('2001:db8:abcd::');
    expect(ipPrefix(undefined)).toBeNull();
  });
});
