import { Inject, Injectable } from '@nestjs/common';
import { PresenceStatus } from '@nezfocus/shared';
import { and, eq, inArray, ne, or } from 'drizzle-orm';
import { FriendshipStatus, friendships } from '../friends/friends.schema.js';
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

  // AUTH-05 AC1: everyone sharing at least one server, and friends.
  async receivers(userId: bigint): Promise<bigint[]> {
    const mine = this.db
      .select({ serverId: serverMembers.serverId })
      .from(serverMembers)
      .where(eq(serverMembers.userId, userId));
    const [members, friends] = await Promise.all([
      this.db
        .selectDistinct({ userId: serverMembers.userId })
        .from(serverMembers)
        .where(
          and(
            inArray(serverMembers.serverId, mine),
            ne(serverMembers.userId, userId),
          ),
        ),
      this.db
        .select({ low: friendships.userIdLow, high: friendships.userIdHigh })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, FriendshipStatus.accepted),
            or(
              eq(friendships.userIdLow, userId),
              eq(friendships.userIdHigh, userId),
            ),
          ),
        ),
    ]);
    return [
      ...new Set([
        ...members.map((r) => r.userId),
        ...friends.map((f) => (f.low === userId ? f.high : f.low)),
      ]),
    ];
  }
}
