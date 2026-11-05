import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  type ClientPlatform,
  type DeviceInfo,
  type SessionEndReason,
  type TokenPairResponse,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { SessionRevoker } from '../gateway/session-revoker.js';
import { SessionRepository } from './session.repository.js';
import {
  ACCESS_TOKEN_SECONDS,
  hashRefreshToken,
  REFRESH_TOKEN_SECONDS,
  TokenService,
} from './token.service.js';

export type ClientInfo = { platform: ClientPlatform; ip: string | undefined };

export type StartedSession = TokenPairResponse & { session_id: string };

// NFR-PRIV-02: keep only the network part (IPv4 /24, IPv6 /48).
export const ipPrefix = (ip: string | undefined): string | null => {
  if (!ip) return null;
  const v4 = ip.replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4))
    return v4.split('.').slice(0, 3).join('.') + '.0';
  return ip.split(':').slice(0, 3).join(':') + '::';
};

// CR-28 #11: a revoked session answers with its reason; reuse has its own code.
export const sessionEnded = (reason: string | null) =>
  reason === 'reuse_detected'
    ? new AppError(
        ErrorCode.RefreshTokenReused,
        'Session closed: refresh token reused',
        undefined,
        { reason },
      )
    : new AppError(
        ErrorCode.TokenInvalid,
        'Session ended',
        undefined,
        reason ? { reason } : {},
      );

@Injectable()
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly revoker: SessionRevoker,
  ) {}

  private refreshExpiry() {
    return new Date(this.clock.now().getTime() + REFRESH_TOKEN_SECONDS * 1000);
  }

  // REQ-AUTH-02: "new device" = this device id never signed in to this account.
  isKnownDevice(userId: bigint, deviceId: string) {
    return this.sessions.hasDeviceSession(userId, deviceId);
  }

  async start(
    userId: bigint,
    device: DeviceInfo,
    client: ClientInfo,
  ): Promise<StartedSession> {
    const sessionId = this.ids.next();
    const refresh = this.tokens.newRefreshToken();
    await this.sessions.create(
      {
        id: sessionId,
        userId,
        deviceId: device.id,
        deviceName: device.name ?? null,
        platform: client.platform,
        ipPrefix: ipPrefix(client.ip),
      },
      { tokenHash: refresh.hash, expiresAt: this.refreshExpiry() },
    );
    return {
      access_token: await this.tokens.signAccess({ userId, sessionId }),
      refresh_token: refresh.token,
      expires_in: ACCESS_TOKEN_SECONDS,
      session_id: sessionId.toString(),
    };
  }

  // REQ-AUTH-04 rotation: each refresh token works once; a second use revokes the family.
  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    const oldHash = hashRefreshToken(refreshToken);
    const state = await this.sessions.findRefreshToken(oldHash);
    if (!state)
      throw new AppError(ErrorCode.TokenInvalid, 'Invalid refresh token');
    if (state.revokedAt) throw sessionEnded(state.revokeReason);
    if (state.usedAt) return this.reuseDetected(state.sessionId);
    if (state.expiresAt <= this.clock.now())
      throw new AppError(ErrorCode.TokenInvalid, 'Refresh token expired');

    const next = this.tokens.newRefreshToken();
    const rotated = await this.sessions.rotate(
      oldHash,
      { tokenHash: next.hash, expiresAt: this.refreshExpiry() },
      this.clock.now(),
    );
    if (!rotated) return this.reuseDetected(state.sessionId);
    return {
      access_token: await this.tokens.signAccess({
        userId: state.userId,
        sessionId: state.sessionId,
      }),
      refresh_token: next.token,
      expires_in: ACCESS_TOKEN_SECONDS,
    };
  }

  async revoke(sessionId: bigint, reason: SessionEndReason) {
    await this.sessions.revoke(sessionId, reason, this.clock.now());
    await this.revoker.disconnect(sessionId, reason);
  }

  private async reuseDetected(sessionId: bigint): Promise<never> {
    await this.revoke(sessionId, 'reuse_detected');
    throw sessionEnded('reuse_detected');
  }
}
