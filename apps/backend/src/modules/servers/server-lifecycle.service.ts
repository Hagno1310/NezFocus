import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ErrorCode,
  SERVER_RESTORE_DAYS,
  type DeletedServersResponse,
  type ServerResponse,
  type TransferOwnerRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { AuthService } from '../auth/auth.service.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { NotificationService } from '../notifications/notification-service.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { AuditLogService } from '../safety/audit-log.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { VoiceService } from '../voice/voice.service.js';
import { serverIconUrl } from '../attachments/media.js';
import { toServerSummary } from './servers.dto.js';
import { ServersRepository } from './servers.repository.js';
import { ServersService } from './servers.service.js';

const DAY_MS = 24 * 60 * 60_000;
const PURGE_EVERY_MS = 60 * 60_000;

const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown server');
const notOwner = () =>
  new AppError(ErrorCode.Forbidden, 'Only the Owner can do this');

// REQ-SRV-05: leave, delete (30 days to restore, then purge), restore, transfer the Owner.
@Injectable()
export class ServerLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerLifecycleService.name);
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(
    private readonly repo: ServersRepository,
    private readonly servers: ServersService,
    private readonly users: UsersRepository,
    private readonly auth: AuthService,
    private readonly cache: PermissionCache,
    private readonly events: EventPublisher,
    private readonly voice: VoiceService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditLogService,
    private readonly clock: Clock,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(
      () =>
        void this.purge().catch((err: unknown) =>
          this.logger.error('server purge', err),
        ),
      PURGE_EVERY_MS,
    );
    this.sweeper.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  // AC3: the Owner never leaves (40012); AC5: out of the server's room now, minutes kept.
  async leave(userId: bigint, serverId: bigint) {
    const server = await this.repo.summary(serverId);
    if (!server || !(await this.repo.isMember(serverId, userId)))
      throw notFound();
    if (server.ownerId === userId)
      throw new AppError(
        ErrorCode.OwnerCannotLeave,
        'Transfer the Owner role first',
      );
    await this.voice
      .disconnect(userId, { serverId }, 'left_server')
      .catch((err: unknown) => this.logger.error(`voice ${userId}`, err));
    if (!(await this.repo.removeMember(serverId, userId))) return;
    await this.cache.invalidateServer(serverId);
    // No `action`: the app drops the server without a dialog (kick / ban carry one).
    const removed = {
      server_id: serverId.toString(),
      user_id: userId.toString(),
    };
    await this.events.toUser(userId, 'SERVER_MEMBER_REMOVE', removed);
    await this.events.toServer(serverId, 'SERVER_MEMBER_REMOVE', removed);
  }

  // AC4: gone from every member's rail, its invites answer 40041 until a restore.
  async delete(userId: bigint, serverId: bigint) {
    const server = await this.repo.summary(serverId);
    if (!server || !(await this.repo.isMember(serverId, userId)))
      throw notFound();
    if (server.ownerId !== userId) throw notOwner();
    const rooms = await this.repo.voiceChannelIds(serverId);
    if (!(await this.repo.softDelete(serverId, this.clock.now()))) return;
    for (const channelId of rooms)
      await this.voice
        .roomDeleted(serverId, channelId)
        .catch((err: unknown) => this.logger.error(`room ${channelId}`, err));
    await this.cache.invalidateServer(serverId);
    await this.events.toServer(serverId, 'SERVER_DELETE', {
      id: serverId.toString(),
    });
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId: serverId,
      action: 'SERVER_DELETE',
    });
  }

  // v1.7: back on every member's rail, nobody is notified.
  async restore(userId: bigint, serverId: bigint): Promise<ServerResponse> {
    const server = await this.repo.findAny(serverId);
    if (server?.ownerId !== userId || !server.deletedAt) throw notFound();
    if (!(await this.repo.restore(serverId, this.restoreSince())))
      throw notFound();
    await this.cache.invalidateServer(serverId);
    for (const memberId of await this.repo.memberIds(serverId))
      if (memberId !== userId)
        await this.events.toUser(
          memberId,
          'SERVER_CREATE',
          await this.servers.get(memberId, serverId),
        );
    const mine = await this.servers.get(userId, serverId);
    await this.events.toUser(userId, 'SERVER_CREATE', mine);
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId: serverId,
      action: 'SERVER_RESTORE',
    });
    return mine;
  }

  async deleted(userId: bigint): Promise<DeletedServersResponse> {
    const rows = await this.repo.deletedOwnedBy(userId, this.restoreSince());
    return {
      servers: rows.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        icon_url: serverIconUrl(s.iconKey),
        deleted_at: s.deletedAt!.toISOString(),
        restore_until: new Date(
          s.deletedAt!.getTime() + SERVER_RESTORE_DAYS * DAY_MS,
        ).toISOString(),
      })),
    };
  }

  // AC1, AC2, v1.6: the new Owner is an active member; the old one keeps every role.
  async transfer(userId: bigint, serverId: bigint, body: TransferOwnerRequest) {
    const server = await this.repo.summary(serverId);
    if (!server || !(await this.repo.isMember(serverId, userId)))
      throw notFound();
    if (server.ownerId !== userId) throw notOwner();
    const toId = BigInt(body.user_id);
    if (toId === userId)
      throw new AppError(ErrorCode.ValidationError, 'Invalid request', {
        user_id: [{ code: 'SELF', message: 'Already the Owner' }],
      });
    const me = await this.users.findById(userId);
    if (!me) throw notFound();
    await this.auth.confirmPassword(me, body.password);
    const to = await this.users.findById(toId);
    if (to && to.accountStatus !== 'active')
      throw new AppError(
        ErrorCode.CannotMessageUser,
        'This account cannot be the Owner',
      );
    const done = await this.repo.transferOwner(serverId, userId, toId);
    if (done === 'not_owner') throw notOwner();
    if (done === 'not_member')
      throw new AppError(ErrorCode.NotFound, 'Unknown member');

    await this.cache.invalidateServer(serverId);
    const summary = await this.repo.summary(serverId);
    if (summary)
      await this.events.toServer(
        serverId,
        'SERVER_UPDATE',
        toServerSummary(summary),
      );
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId: toId,
      action: 'SERVER_OWNER_TRANSFER',
      changes: {
        before: { owner_id: userId.toString() },
        after: { owner_id: toId.toString() },
      },
    });
    await this.notifications.create(toId, 'owner_transferred', {
      actor_id: userId.toString(),
      server_id: serverId.toString(),
    });
  }

  // SRS 8.6: run by the sweeper; exposed for the e2e clock.
  async purge() {
    const cutoff = this.restoreSince();
    const ids = await this.repo.purgeDeletedBefore(cutoff);
    if (ids.length) this.logger.log(`purged ${ids.length} servers`);
    return ids;
  }

  private restoreSince() {
    return new Date(this.clock.now().getTime() - SERVER_RESTORE_DAYS * DAY_MS);
  }
}
