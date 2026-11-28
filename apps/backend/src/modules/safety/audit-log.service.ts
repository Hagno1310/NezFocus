import { Injectable } from '@nestjs/common';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { AuditLogRepository } from './audit-log.repository.js';
import type { AuditChanges } from './audit-log.schema.js';

// SRS 8.2 action_type: one name per administrative action of REQ-ROLE-06.
export type AuditAction =
  | 'MEMBER_KICK'
  | 'MEMBER_BAN'
  | 'MEMBER_UNBAN'
  | 'MEMBER_TIMEOUT'
  | 'MEMBER_TIMEOUT_UPDATE'
  | 'MEMBER_TIMEOUT_REMOVE'
  | 'MEMBER_ROLE_UPDATE'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_UPDATE'
  | 'CHANNEL_DELETE'
  | 'OVERWRITE_UPDATE'
  | 'OVERWRITE_DELETE'
  | 'INVITE_CREATE'
  | 'INVITE_DELETE'
  | 'SERVER_UPDATE'
  | 'SERVER_OWNER_TRANSFER';

export type AuditEntry = {
  serverId: bigint;
  actorId: bigint;
  targetId?: bigint | null; // the member, role, channel… acted on
  action: AuditAction;
  reason?: string | null;
  changes?: AuditChanges | null;
};

// REQ-ROLE-09. Call it after the action succeeded: a refused one (40302…) leaves no entry (AC3).
// Owner: safety (A). Servers, safety (SAFE-01) and SRV-05 inject it.
@Injectable()
export class AuditLogService {
  constructor(
    private readonly repo: AuditLogRepository,
    private readonly ids: SnowflakeGenerator,
  ) {}

  record(e: AuditEntry) {
    return this.repo.insert({
      id: this.ids.next(),
      serverId: e.serverId,
      actorId: e.actorId,
      targetId: e.targetId ?? null,
      actionType: e.action,
      reason: e.reason ?? null,
      changes: e.changes ?? null,
    });
  }
}

// before / after of a role (ROLE_*): what S-SET-02 can change.
export const roleShape = (r: {
  name: string;
  permissions: bigint;
  position: number;
  isMentionable: boolean;
}) => ({
  name: r.name,
  permissions: r.permissions.toString(),
  position: r.position,
  is_mentionable: r.isMentionable,
});
