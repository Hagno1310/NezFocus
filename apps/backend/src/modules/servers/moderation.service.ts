import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ErrorCode,
  Permission,
  TIMEOUT_MAX_MS,
  TIMEOUT_MIN_MS,
  canActOnMember,
  canTimeOutMember,
  matchesMember,
  type BanListQuery,
  type BanListResponse,
  type DispatchPayload,
  type ModerationData,
  type ServerBan,
  type ServerMember,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { avatarUrls } from '../attachments/media.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { ForegroundReader } from '../gateway/foreground.js';
import { NotificationService } from '../notifications/notification-service.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { PermissionService } from '../permissions/permission.service.js';
import { AuditLogService } from '../safety/audit-log.service.js';
import { VoiceService } from '../voice/voice.service.js';
import { MEMBER_BANNED, type MemberBanned } from './member-events.js';
import { MembersRepository } from './members.repository.js';
import { toServerMember } from './members.service.js';
import { ModerationRepository, type BanRow } from './moderation.repository.js';
import { RolesRepository, type LockedRoles } from './roles.repository.js';
import { actorOf } from './roles.service.js';
import { ServersRepository } from './servers.repository.js';

const notFound = (what: string) => new AppError(ErrorCode.NotFound, what);
const outranked = () =>
  new AppError(
    ErrorCode.InsufficientRoleHierarchy,
    'The member is the Owner or level with or above you',
  );
const DAY_MS = 24 * 60 * 60_000;
const SLACK_MS = 10_000;

export const toServerBan = (b: BanRow): ServerBan => ({
  user: {
    id: b.userId.toString(),
    username: b.username,
    display_name: b.displayName,
    avatar: avatarUrls(b.avatarKey),
  },
  reason: b.reason,
  banned_by: b.bannedBy && {
    id: b.bannedBy.id.toString(),
    username: b.bannedBy.username,
    display_name: b.bannedBy.displayName,
  },
  created_at: b.createdAt.toISOString(),
});

// "{created_at}|{user_id}" of the last row: newest first, ties by user id.
const banCursor = (b: ServerBan) => `${b.created_at}|${b.user.id}`;
const after = (b: ServerBan, cursor: string) => {
  const [at, id] = cursor.split('|');
  return (
    b.created_at < at! ||
    (b.created_at === at && BigInt(b.user.id) < BigInt(id ?? 0))
  );
};

// REQ-ROLE-05 timeout / kick / ban, REQ-ROLE-07 ban list. Every success: the permission cache
// is dropped (ROLE-08 AC3), an audit entry (ROLE-09), the voice seat ends (AC4).
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly repo: ModerationRepository,
    private readonly members: MembersRepository,
    private readonly roles: RolesRepository,
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly cache: PermissionCache,
    private readonly events: EventPublisher,
    private readonly foreground: ForegroundReader,
    private readonly notifications: NotificationService,
    private readonly voice: VoiceService,
    private readonly audit: AuditLogService,
    private readonly emitter: EventEmitter2,
    private readonly clock: Clock,
  ) {}

  // AC5: a new end counts from now; null lifts it. ADMINISTRATOR cannot be timed out (CR-28 #18).
  async timeout(
    userId: bigint,
    serverId: bigint,
    targetId: bigint,
    body: { timeout_until: string | null; reason?: string | null },
  ): Promise<ServerMember> {
    await this.require(userId, serverId, Permission.MODERATE_MEMBERS);
    const now = this.clock.now();
    const until =
      body.timeout_until === null ? null : new Date(body.timeout_until);
    if (until) {
      const ms = until.getTime() - now.getTime();
      // The client counts from its own now: a few seconds of slack for the request.
      if (ms < TIMEOUT_MIN_MS - SLACK_MS || ms > TIMEOUT_MAX_MS + SLACK_MS)
        throw new AppError(ErrorCode.ValidationError, 'Timeout out of range', {
          timeout_until: [
            { code: 'RANGE', message: 'From 60 seconds to 28 days from now' },
          ],
        });
    }
    const done = await this.roles.locked(serverId, userId, async (locked) => {
      const target = await this.target(locked, serverId, userId, targetId);
      const allowed = until
        ? canTimeOutMember(target.server, target.actor, target.member)
        : canActOnMember(target.server, target.actor, target.member);
      if (!allowed) throw outranked();
      const before = await this.repo.timeoutOf(locked.tx, serverId, targetId);
      const running = !!before?.until && before.until > now;
      // CR-28 #40: changing the duration keeps the reason; lifting clears it.
      const reason = !until
        ? null
        : body.reason !== undefined
          ? body.reason
          : running
            ? (before.reason ?? null)
            : null;
      await this.repo.setTimeout(locked.tx, serverId, targetId, until, reason);
      return { before, running, reason };
    });
    if (!until && !done.running) {
      const unchanged = await this.members.one(serverId, targetId);
      return toServerMember(unchanged!);
    }
    await this.cache.invalidateServer(serverId);
    const member = (await this.members.one(serverId, targetId))!;
    const shown = toServerMember(member);
    await this.events.toServer(serverId, 'SERVER_MEMBER_UPDATE', {
      server_id: serverId.toString(),
      ...shown,
    });
    const action = !until
      ? 'MEMBER_TIMEOUT_REMOVE'
      : done.running
        ? 'MEMBER_TIMEOUT_UPDATE'
        : 'MEMBER_TIMEOUT';
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId,
      action,
      reason: done.reason,
      changes: {
        before: {
          timeout_until: done.running
            ? done.before!.until!.toISOString()
            : null,
        },
        after: { timeout_until: until?.toISOString() ?? null },
      },
    });
    if (until) {
      await this.disconnect(targetId, serverId, 'timed_out');
      await this.notify(targetId, {
        server_id: serverId.toString(),
        action: done.running ? 'timeout_changed' : 'timeout',
        timeout_until: until.toISOString(),
        reason: done.reason,
      });
    }
    return shown;
  }

  async kick(
    userId: bigint,
    serverId: bigint,
    targetId: bigint,
    reason: string | null,
  ) {
    await this.require(userId, serverId, Permission.KICK_MEMBERS);
    await this.roles.locked(serverId, userId, async (locked) => {
      const target = await this.target(locked, serverId, userId, targetId);
      if (!canActOnMember(target.server, target.actor, target.member))
        throw outranked();
      await this.repo.remove(locked.tx, serverId, targetId);
    });
    await this.removed(serverId, targetId, 'kick', reason);
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId,
      action: 'MEMBER_KICK',
      reason,
      changes: { before: { member: true }, after: { member: false } },
    });
  }

  // REQ-ROLE-07: a user not in the server can be banned too. Banned twice: nothing changes.
  async ban(
    userId: bigint,
    serverId: bigint,
    targetId: bigint,
    body: { reason: string | null; delete_message_days: 0 | 1 | 7 },
  ) {
    await this.require(userId, serverId, Permission.BAN_MEMBERS);
    if (!(await this.repo.userExists(targetId))) throw notFound('Unknown user');
    const result = await this.roles.locked(serverId, userId, async (locked) => {
      const roleIds = await locked.memberRoleIds(targetId);
      const actor = actorOf(serverId, userId, locked);
      const member = {
        userId: targetId.toString(),
        roleIds: (roleIds ?? []).map(String),
      };
      if (!canActOnMember(actor.server, actor.member, member))
        throw outranked();
      const added = await this.repo.ban(locked.tx, {
        serverId,
        userId: targetId,
        bannedBy: userId,
        reason: body.reason,
      });
      const wasMember =
        added && (await this.repo.remove(locked.tx, serverId, targetId));
      return { added, wasMember };
    });
    if (!result.added) return;
    if (result.wasMember)
      await this.removed(serverId, targetId, 'ban', body.reason);
    if (body.delete_message_days > 0) {
      const banned: MemberBanned = {
        serverId,
        userId: targetId,
        since: new Date(
          this.clock.now().getTime() - body.delete_message_days * DAY_MS,
        ),
      };
      // AC1: awaited, so the 204 comes after the messages are gone.
      await this.emitter.emitAsync(MEMBER_BANNED, banned);
    }
    const [row] = await this.repo.bans(serverId, targetId);
    if (row)
      await this.toBanManagers(serverId, 'SERVER_BAN_ADD', {
        server_id: serverId.toString(),
        ...toServerBan(row),
      });
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId,
      action: 'MEMBER_BAN',
      reason: body.reason,
      changes: {
        before: { member: result.wasMember, banned: false },
        after: {
          member: false,
          banned: true,
          delete_message_days: body.delete_message_days,
        },
      },
    });
  }

  async unban(userId: bigint, serverId: bigint, targetId: bigint) {
    await this.require(userId, serverId, Permission.BAN_MEMBERS);
    const gone = await this.repo.unban(serverId, targetId);
    if (!gone) throw notFound('Unknown ban');
    await this.toBanManagers(serverId, 'SERVER_BAN_REMOVE', {
      server_id: serverId.toString(),
      user_id: targetId.toString(),
    });
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId,
      action: 'MEMBER_UNBAN',
      changes: {
        before: { banned: true, reason: gone.reason },
        after: { banned: false },
      },
    });
  }

  async listBans(
    userId: bigint,
    serverId: bigint,
    query: BanListQuery,
  ): Promise<BanListResponse> {
    await this.require(userId, serverId, Permission.BAN_MEMBERS);
    const all = (await this.repo.bans(serverId))
      .map(toServerBan)
      .filter((b) => matchesMember(b, query.q ?? ''));
    const rest = query.after ? all.filter((b) => after(b, query.after!)) : all;
    const bans = rest.slice(0, query.limit);
    return {
      bans,
      next_cursor:
        rest.length > query.limit ? banCursor(bans[bans.length - 1]!) : null,
    };
  }

  // 40401 for a server the caller is not in; 40302 without the bit — before anything is written.
  private async require(userId: bigint, serverId: bigint, bit: bigint) {
    if (!(await this.servers.isMember(serverId, userId)))
      throw notFound('Unknown server');
    await this.permissions.require(userId, { serverId }, bit);
  }

  private async target(
    locked: LockedRoles,
    serverId: bigint,
    userId: bigint,
    targetId: bigint,
  ) {
    const roleIds = await locked.memberRoleIds(targetId);
    if (!roleIds) throw notFound('Unknown member');
    const actor = actorOf(serverId, userId, locked);
    return {
      server: actor.server,
      actor: actor.member,
      member: { userId: targetId.toString(), roleIds: roleIds.map(String) },
    };
  }

  // Kick / ban of a member: out of the room first (minutes settle, STUDY-15), then the events.
  private async removed(
    serverId: bigint,
    targetId: bigint,
    action: 'kick' | 'ban',
    reason: string | null,
  ) {
    await this.cache.invalidateServer(serverId);
    await this.disconnect(
      targetId,
      serverId,
      action === 'kick' ? 'kicked' : 'banned',
    );
    const removed = {
      server_id: serverId.toString(),
      user_id: targetId.toString(),
    };
    await this.events.toUser(targetId, 'SERVER_MEMBER_REMOVE', {
      ...removed,
      action,
      reason,
    });
    await this.events.toServer(serverId, 'SERVER_MEMBER_REMOVE', removed);
    await this.notify(targetId, {
      server_id: serverId.toString(),
      action,
      timeout_until: null,
      reason,
    });
  }

  private async disconnect(
    userId: bigint,
    serverId: bigint,
    reason: 'kicked' | 'banned' | 'timed_out',
  ) {
    await this.voice
      .disconnect(userId, { serverId }, reason)
      .catch((err: unknown) => this.logger.error(`voice ${userId}`, err));
  }

  // REQ-NOTIF-05: no push; an app open on the screen sees the dialog, so the item is read.
  private async notify(userId: bigint, data: ModerationData) {
    const open = data.action === 'kick' || data.action === 'ban';
    await this.notifications
      .create(userId, 'moderation', data, {
        read: open && this.foreground.inForeground(userId),
      })
      .catch((err: unknown) =>
        this.logger.error(`moderation item ${userId}`, err),
      );
  }

  private async toBanManagers<T extends 'SERVER_BAN_ADD' | 'SERVER_BAN_REMOVE'>(
    serverId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    for (const id of await this.servers.memberIds(serverId))
      if (await this.permissions.can(id, { serverId }, Permission.BAN_MEMBERS))
        await this.events.toUser(id, t, d);
  }
}
