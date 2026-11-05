import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@nezfocus/shared';
import { jwtVerify, SignJWT } from 'jose';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';

export const ACCESS_TOKEN_SECONDS = 15 * 60; // REQ-AUTH-02
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;

export type AccessClaims = { userId: bigint; sessionId: bigint };

export const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest();

@Injectable()
export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    config: ConfigService,
    private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(
      config.getOrThrow<string>('JWT_SECRET'),
    );
  }

  private nowSeconds() {
    return Math.floor(this.clock.now().getTime() / 1000);
  }

  signAccess({ userId, sessionId }: AccessClaims): Promise<string> {
    const now = this.nowSeconds();
    return new SignJWT({ sid: sessionId.toString() })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId.toString())
      .setIssuedAt(now)
      .setExpirationTime(now + ACCESS_TOKEN_SECONDS)
      .sign(this.key);
  }

  // Any failure (bad signature, expired, malformed) is 40100.
  async verifyAccess(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        currentDate: this.clock.now(),
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string')
        throw new Error('missing claims');
      return { userId: BigInt(payload.sub), sessionId: BigInt(payload.sid) };
    } catch {
      throw new AppError(ErrorCode.TokenInvalid, 'Invalid access token');
    }
  }

  newRefreshToken() {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: hashRefreshToken(token) };
  }
}
