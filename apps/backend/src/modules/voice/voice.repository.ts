import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { serverMembers } from '../servers/servers.schema.js';

@Injectable()
export class VoiceRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async serverIdsOf(userId: bigint): Promise<bigint[]> {
    const rows = await this.db
      .select({ serverId: serverMembers.serverId })
      .from(serverMembers)
      .where(eq(serverMembers.userId, userId));
    return rows.map((r) => r.serverId);
  }

  // REQ-VC-04 AC5. Not a member → false (the token check refuses them anyway).
  async modMuted(serverId: bigint, userId: bigint): Promise<boolean> {
    const [row] = await this.db
      .select({ modMuted: serverMembers.modMuted })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId),
        ),
      );
    return row?.modMuted ?? false;
  }

  // "serverId:userId" of everyone mod-muted among these users.
  async modMutedAmong(userIds: readonly bigint[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();
    const rows = await this.db
      .select({
        serverId: serverMembers.serverId,
        userId: serverMembers.userId,
      })
      .from(serverMembers)
      .where(
        and(
          inArray(serverMembers.userId, [...userIds]),
          eq(serverMembers.modMuted, true),
        ),
      );
    return new Set(rows.map((r) => `${r.serverId}:${r.userId}`));
  }
}
