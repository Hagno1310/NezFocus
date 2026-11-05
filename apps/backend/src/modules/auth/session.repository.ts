import { Inject, Injectable } from '@nestjs/common';
import type { SessionEndReason } from '@nezfocus/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { users } from '../users/users.schema.js';
import { authSessions, refreshTokens } from './auth.schema.js';

export type NewSession = {
  id: bigint;
  userId: bigint;
  deviceId: string;
  deviceName: string | null;
  platform: string;
  ipPrefix: string | null;
};

export type NewRefreshToken = { tokenHash: Buffer; expiresAt: Date };

export type RefreshTokenState = {
  sessionId: bigint;
  userId: bigint;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  revokeReason: string | null;
};

// What the auth guard needs on every request, in one query.
export type SessionAuthState = {
  userId: bigint;
  revokedAt: Date | null;
  revokeReason: string | null;
  accountCompletedAt: Date | null;
};

@Injectable()
export class SessionRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(session: NewSession, refresh: NewRefreshToken) {
    await this.db.transaction(async (tx) => {
      await tx.insert(authSessions).values(session);
      await tx
        .insert(refreshTokens)
        .values({ ...refresh, sessionId: session.id });
    });
  }

  async findRefreshToken(
    tokenHash: Buffer,
  ): Promise<RefreshTokenState | undefined> {
    const [row] = await this.db
      .select({
        sessionId: refreshTokens.sessionId,
        expiresAt: refreshTokens.expiresAt,
        usedAt: refreshTokens.usedAt,
        userId: authSessions.userId,
        revokedAt: authSessions.revokedAt,
        revokeReason: authSessions.revokeReason,
      })
      .from(refreshTokens)
      .innerJoin(authSessions, eq(authSessions.id, refreshTokens.sessionId))
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return row;
  }

  // Marks the old token used and adds the next one. False when another request used it
  // first: the caller treats that as reuse.
  async rotate(
    oldHash: Buffer,
    next: NewRefreshToken,
    now: Date,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [used] = await tx
        .update(refreshTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(refreshTokens.tokenHash, oldHash),
            isNull(refreshTokens.usedAt),
          ),
        )
        .returning({ sessionId: refreshTokens.sessionId });
      if (!used) return false;
      await tx
        .insert(refreshTokens)
        .values({ ...next, sessionId: used.sessionId });
      await tx
        .update(authSessions)
        .set({ lastActiveAt: now })
        .where(eq(authSessions.id, used.sessionId));
      return true;
    });
  }

  // Keeps the first reason when called twice.
  async revoke(sessionId: bigint, reason: SessionEndReason, now: Date) {
    await this.db
      .update(authSessions)
      .set({ revokedAt: now, revokeReason: reason })
      .where(
        and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)),
      );
  }

  async hasDeviceSession(userId: bigint, deviceId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.deviceId, deviceId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async findAuthState(
    sessionId: bigint,
  ): Promise<SessionAuthState | undefined> {
    const [row] = await this.db
      .select({
        userId: authSessions.userId,
        revokedAt: authSessions.revokedAt,
        revokeReason: authSessions.revokeReason,
        accountCompletedAt: users.accountCompletedAt,
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(eq(authSessions.id, sessionId));
    return row;
  }
}
