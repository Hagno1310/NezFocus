import { Injectable } from '@nestjs/common';
import {
  CreateInviteRequest,
  ErrorCode,
  MAX_SERVERS_PER_USER,
  Permission,
  type InvitePreview,
  type InviteResponse,
  type ServerInviteList,
  type ServerResponse,
} from '@nezfocus/shared';
import { AppError, rateLimited } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import { avatarUrls, serverIconUrl } from '../attachments/media.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PresenceReader } from '../gateway/presence.service.js';
import { PermissionService } from '../permissions/permission.service.js';
import { InviteCodes, isLive, maxAgeOf } from './invite-rules.js';
import { InvitesRepository } from './invites.repository.js';
import { ChannelTypeCode, type InviteRow } from './servers.schema.js';
import { ServersService } from './servers.service.js';

// REQ-SRV-03 AC3: more than 30 unknown codes in a minute from one IP → 40029.
const UNKNOWN_PER_MINUTE = 30;
const CODE_ATTEMPTS = 5;

const invalid = () =>
  new AppError(ErrorCode.InviteInvalid, 'Invite is invalid');
const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown channel');

const toInviteResponse = (row: InviteRow): InviteResponse => ({
  code: row.code,
  server_id: row.serverId.toString(),
  channel_id: row.channelId.toString(),
  max_age: maxAgeOf(row),
  max_uses: row.maxUses,
  uses: row.uses,
  expires_at: row.expiresAt?.toISOString() ?? null,
  created_at: row.createdAt.toISOString(),
});

@Injectable()
export class InvitesService {
  constructor(
    private readonly repo: InvitesRepository,
    private readonly servers: ServersService,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
    private readonly presence: PresenceReader,
    private readonly kv: KeyValueStore,
    private readonly clock: Clock,
    private readonly codes: InviteCodes,
  ) {}

  async create(
    userId: bigint,
    channelId: bigint,
    input: CreateInviteRequest,
  ): Promise<{ invite: InviteResponse; created: boolean }> {
    const body = CreateInviteRequest.parse(input);
    const channel = await this.repo.channel(channelId);
    if (!channel || !(await this.repo.isMember(channel.serverId, userId)))
      throw notFound();
    await this.permissions.require(
      userId,
      { channelId },
      Permission.CREATE_INVITE,
    );
    const now = this.clock.now();
    // v1.5: my own live invite with the same settings comes back instead of a new one.
    const same = (await this.repo.ownInvites(userId, channelId)).find(
      (r) =>
        isLive(r, now) &&
        r.maxUses === body.max_uses &&
        maxAgeOf(r) === body.max_age,
    );
    if (same) return { invite: toInviteResponse(same), created: false };

    for (let i = 0; i < CODE_ATTEMPTS; i++) {
      const row: InviteRow = {
        code: this.codes.next(),
        serverId: channel.serverId,
        channelId,
        creatorId: userId,
        maxUses: body.max_uses,
        uses: 0,
        expiresAt: body.max_age
          ? new Date(now.getTime() + body.max_age * 1000)
          : null,
        revokedAt: null,
        createdAt: now,
      };
      if (await this.repo.insert(row))
        return { invite: toInviteResponse(row), created: true };
    }
    throw new AppError(ErrorCode.InternalError, 'No free invite code');
  }

  async preview(code: string, ip: string | undefined): Promise<InvitePreview> {
    const invite = await this.lookup(code, ip);
    if (!isLive(invite, this.clock.now())) throw invalid();
    const data = await this.repo.preview(invite);
    const creator = data.creator;
    const channel = await this.repo.channel(invite.channelId);
    return {
      code: invite.code,
      server: {
        id: data.server.id.toString(),
        name: data.server.name,
        icon_url: serverIconUrl(data.server.iconKey),
        member_count: data.memberIds.length,
        online_count: this.presence.onlineCount(data.memberIds),
      },
      // v1.9 CR-17: no inviter once they left, are pending deletion or deleted.
      inviter:
        creator?.active && creator.member
          ? {
              display_name: creator.displayName ?? creator.username ?? '',
              avatar: avatarUrls(creator.avatarKey),
            }
          : null,
      // Decision 19/11/2026: a room invite (voice channel) names its room; text ones don't.
      channel:
        channel?.type === ChannelTypeCode.voice
          ? { id: channel.id.toString(), name: channel.name ?? '' }
          : null,
    };
  }

  async accept(
    userId: bigint,
    code: string,
    ip: string | undefined,
  ): Promise<ServerResponse> {
    const invite = await this.lookup(code, ip);
    const now = this.clock.now();
    const result = await this.repo.accept(
      code,
      userId,
      now,
      MAX_SERVERS_PER_USER,
    );
    if (result === 'invalid') throw invalid();
    if (result === 'banned')
      throw new AppError(ErrorCode.BannedFromServer, 'Banned from this server');
    if (result === 'max-servers')
      throw new AppError(
        ErrorCode.MaxServersReached,
        `Already in ${MAX_SERVERS_PER_USER} servers`,
      );
    const server = await this.servers.get(userId, invite.serverId);
    if (result === 'joined') {
      // ponytail: the "X đã tham gia" system message in the welcome channel is P2-A4.1 (#103).
      const user = await this.repo.user(userId);
      await this.events.toUser(userId, 'SERVER_CREATE', server);
      await this.events.toServer(invite.serverId, 'SERVER_MEMBER_ADD', {
        server_id: invite.serverId.toString(),
        user: {
          id: user.id.toString(),
          username: user.username,
          display_name: user.displayName,
          avatar: avatarUrls(user.avatarKey),
        },
        role_ids: [],
        joined_at: now.toISOString(),
        timeout_until: null,
      });
    }
    return server;
  }

  // v1.9 CR-17: the creator, or MANAGE_SERVER (AC5: anyone else → 40302).
  async revoke(userId: bigint, code: string) {
    const invite = await this.repo.find(code);
    if (!invite) throw invalid();
    if (invite.creatorId !== userId) {
      if (!(await this.repo.isMember(invite.serverId, userId)))
        throw new AppError(ErrorCode.Forbidden, 'missing permission');
      await this.permissions.require(
        userId,
        { serverId: invite.serverId },
        Permission.MANAGE_SERVER,
      );
    }
    await this.repo.revoke(code, this.clock.now());
  }

  async listForServer(
    userId: bigint,
    serverId: bigint,
  ): Promise<ServerInviteList> {
    if (!(await this.repo.isMember(serverId, userId)))
      throw new AppError(ErrorCode.NotFound, 'Unknown server');
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_SERVER,
    );
    return (await this.repo.liveForServer(serverId, this.clock.now())).map(
      (r) => ({
        ...toInviteResponse(r),
        creator: r.creator && {
          id: r.creator.id.toString(),
          display_name: r.creator.displayName,
          username: r.creator.username,
        },
      }),
    );
  }

  // SRV-03 AC3: past the limit the IP waits the minute out, real codes included.
  private async lookup(code: string, ip: string | undefined) {
    const key = `invite:unknown:${ip ?? 'unknown'}`;
    const seen = await this.kv.peek(key);
    if (seen.count > UNKNOWN_PER_MINUTE) throw rateLimited(seen.resetIn);
    const invite = await this.repo.find(code);
    if (invite) return invite;
    const window = await this.kv.increment(key, 60);
    if (window.count > UNKNOWN_PER_MINUTE) throw rateLimited(window.resetIn);
    throw invalid();
  }
}
