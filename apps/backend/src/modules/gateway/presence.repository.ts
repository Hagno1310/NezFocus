import { Inject, Injectable } from '@nestjs/common';
import { PresenceStatus } from '@nezfocus/shared';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { serverMembers } from '../servers/servers.schema.js';
import { userSettings } from '../users/users.schema.js';

export type PresenceSettings = {
  preferred: PresenceStatus;
  showActivity: boolean;
};

@Injectable()
export class PresenceRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async settings(userId: bigint): Promise<PresenceSettings> {
    const [row] = await this.db
      .select({
        preferred: userSettings.preferredStatus,
        showActivity: userSettings.showStudyActivity,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return {
      preferred: PresenceStatus.catch('online').parse(row?.preferred),
      showActivity: row?.showActivity ?? true,
    };
  }

  async savePreferred(userId: bigint, status: PresenceStatus) {
    await this.db
      .update(userSettings)
      .set({ preferredStatus: status, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
  }

  // AUTH-05 AC1: everyone sharing at least one server. Friends join with P2-B2 (#19).
  async receivers(userId: bigint): Promise<bigint[]> {
    const mine = this.db
      .select({ serverId: serverMembers.serverId })
      .from(serverMembers)
      .where(eq(serverMembers.userId, userId));
    const rows = await this.db
      .selectDistinct({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(
        and(
          inArray(serverMembers.serverId, mine),
          ne(serverMembers.userId, userId),
        ),
      );
    return rows.map((r) => r.userId);
  }
}
