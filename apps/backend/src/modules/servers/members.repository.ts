import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { users } from '../users/users.schema.js';
import { serverMemberRoles, serverMembers } from './servers.schema.js';

export type MemberRow = {
  userId: bigint;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  roleIds: string[];
  joinedAt: Date;
  timeoutUntil: Date | null;
  timeoutReason: string | null;
};

const roleIds = sql<string[]>`coalesce((
  SELECT array_agg(${serverMemberRoles.roleId}::text ORDER BY ${serverMemberRoles.roleId})
  FROM ${serverMemberRoles}
  WHERE ${serverMemberRoles.serverId} = ${serverMembers.serverId}
    AND ${serverMemberRoles.userId} = ${serverMembers.userId}
), '{}')`;

// REQ-ROLE-04: who is in a server, with what S-SET-03 and S-HOME-03 show of them.
@Injectable()
export class MembersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Unsorted: the Vietnamese order is compareMembers, in the service.
  list(serverId: bigint): Promise<MemberRow[]> {
    return this.select(eq(serverMembers.serverId, serverId));
  }

  async one(serverId: bigint, userId: bigint): Promise<MemberRow | undefined> {
    const [row] = await this.select(
      and(
        eq(serverMembers.serverId, serverId),
        eq(serverMembers.userId, userId),
      )!,
    );
    return row;
  }

  private select(where: SQL) {
    return this.db
      .select({
        userId: serverMembers.userId,
        username: users.username,
        displayName: users.displayName,
        avatarKey: users.avatarKey,
        roleIds,
        joinedAt: serverMembers.joinedAt,
        timeoutUntil: serverMembers.timeoutUntil,
        timeoutReason: serverMembers.timeoutReason,
      })
      .from(serverMembers)
      .innerJoin(users, eq(users.id, serverMembers.userId))
      .where(where);
  }
}
