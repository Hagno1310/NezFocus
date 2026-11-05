import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
