import { Inject, Injectable } from '@nestjs/common';
import type { PushTokenKind } from '@nezfocus/shared';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { authSessions } from '../auth/auth.schema.js';
import { pushTokens } from './push-tokens.schema.js';

@Injectable()
export class PushTokensRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // One token per session: an FCM refresh replaces the old one. A token seen before (another
  // account signed in on the same phone) moves to this session.
  async register(
    userId: bigint,
    sessionId: bigint,
    token: string,
    kind: PushTokenKind,
  ) {
    await this.db.transaction(async (tx) => {
      const [session] = await tx
        .select({ platform: authSessions.platform })
        .from(authSessions)
        .where(eq(authSessions.id, sessionId));
      if (!session) return;
      await tx
        .delete(pushTokens)
        .where(
          and(eq(pushTokens.sessionId, sessionId), ne(pushTokens.token, token)),
        );
      await tx
        .insert(pushTokens)
        .values({ token, userId, sessionId, kind, platform: session.platform })
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            userId,
            sessionId,
            kind,
            platform: session.platform,
            lastSeenAt: sql`now()`,
          },
        });
    });
  }

  async remove(userId: bigint, token: string) {
    await this.db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
  }

  async removeForSessions(sessionIds: bigint[]) {
    if (!sessionIds.length) return;
    await this.db
      .delete(pushTokens)
      .where(inArray(pushTokens.sessionId, sessionIds));
  }

  // REQ-NOTIF-04 AC3: FCM answered UNREGISTERED.
  async removeTokens(tokens: string[]) {
    if (!tokens.length) return;
    await this.db.delete(pushTokens).where(inArray(pushTokens.token, tokens));
  }

  async fcmTokens(userId: bigint): Promise<string[]> {
    const rows = await this.db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.kind, 'fcm')));
    return rows.map((r) => r.token);
  }
}
