import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  MAX_CHANNELS_PER_SERVER,
  NO_LETTER_OR_DIGIT_MESSAGE,
  Permission,
  applyPositions,
  findClash,
  planCategoryDelete,
  type ChannelRuleError,
  normalizeTextChannelName,
  type ChannelResponse,
  type CreateChannelRequest,
  type UpdateChannelPositionsRequest,
  type UpdateChannelRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ruleError } from './channel-rules.js';
import { ChannelsRepository, type ChannelMove } from './channels.repository.js';
import { toChannelResponse, toServerSummary } from './servers.dto.js';
import { ServersRepository } from './servers.repository.js';
import { ChannelTypeCode, type ChannelRow } from './servers.schema.js';

const invalid = (field: string, code: string, message: string) =>
  new AppError(ErrorCode.ValidationError, message, {
    [field]: [{ code, message }],
  });
const rejected = (e: ChannelRuleError) => {
  const { field, code, message } = ruleError(e);
  return invalid(field, code, message);
};
const notFound = (what: string) => new AppError(ErrorCode.NotFound, what);

const toMove = (c: ChannelResponse): ChannelMove => ({
  id: BigInt(c.id),
  position: c.position,
  parentId: c.parent_id === null ? null : BigInt(c.parent_id),
  permissionsSynced: c.permissions_synced,
});

// REQ-SRV-02: categories, text and voice channels; names, order, delete.
// ponytail: CHANNEL_* go to every member through EventPublisher.toServer; only people
// who can VIEW_CHANNEL should get them, P2-B1 (#18).
@Injectable()
export class ChannelsService {
  constructor(
    private readonly repo: ChannelsRepository,
    private readonly servers: ServersRepository,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
    private readonly permissions: PermissionService,
  ) {}

  async list(userId: bigint, serverId: bigint): Promise<ChannelResponse[]> {
    await this.memberOf(serverId, userId);
    const visible = [];
    for (const row of await this.repo.listForServer(serverId))
      if (
        await this.permissions.can(
          userId,
          { channelId: row.id },
          Permission.VIEW_CHANNEL,
        )
      )
        visible.push(toChannelResponse(row));
    return visible;
  }

  async create(
    userId: bigint,
    serverId: bigint,
    body: CreateChannelRequest,
  ): Promise<ChannelResponse> {
    const server = await this.memberOf(serverId, userId);
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_CHANNELS,
    );
    // ponytail: a private channel at creation (AC10) needs overwrites, P1-A3.4 (#67).
    if (body.type !== 'category' && body.viewer_role_ids?.length)
      throw invalid(
        'viewer_role_ids',
        'NOT_AVAILABLE',
        'Private channels at creation are not available yet',
      );
    const parentId = body.type === 'category' ? null : body.parent_id;
    // REQ-SRV-02 AC6, v1.9 CR-22: "Bật phòng học" follows the server's template when unsent.
    const focusControl =
      body.type === 'voice'
        ? (body.focus_control ??
          (server.template === 'study_server' ? 'everyone' : 'off'))
        : 'off';
    const channel = await this.repo.locked(serverId, async (locked) => {
      const current = locked.rows.map(toChannelResponse);
      if (
        parentId !== null &&
        !current.some((c) => c.id === parentId && c.type === 'category')
      )
        throw invalid(
          'parent_id',
          'NOT_A_CATEGORY',
          'The parent must be a category of this server',
        );
      const clash = findClash(current, [
        { type: body.type, name: body.name, parent_id: parentId },
      ]);
      if (clash) throw rejected(clash);
      if (current.length >= MAX_CHANNELS_PER_SERVER)
        throw invalid(
          '_',
          'MAX_CHANNELS',
          `A server has at most ${MAX_CHANNELS_PER_SERVER} channels`,
        );
      return toChannelResponse(
        await locked.create({
          id: this.ids.next(),
          serverId,
          parentId: parentId === null ? null : BigInt(parentId),
          type: ChannelTypeCode[body.type],
          name: body.name,
          focusControl,
          // Nothing to follow outside a category (REQ-ROLE-03 v1.8).
          permissionsSynced: body.type === 'category' || parentId !== null,
          createdAt: this.clock.now(),
        }),
      );
    });
    await this.events.toServer(serverId, 'CHANNEL_CREATE', channel);
    return channel;
  }

  async rename(
    userId: bigint,
    channelId: bigint,
    body: UpdateChannelRequest,
  ): Promise<ChannelResponse> {
    const row = await this.managed(userId, channelId);
    const type = toChannelResponse(row).type;
    const name =
      type === 'text' ? normalizeTextChannelName(body.name) : body.name;
    if (!name)
      throw invalid('name', 'NO_LETTER_OR_DIGIT', NO_LETTER_OR_DIGIT_MESSAGE);
    const channel = await this.repo.locked(row.serverId!, async (locked) => {
      const current = locked.rows.map(toChannelResponse);
      const self = current.find((c) => c.id === row.id.toString());
      if (!self) throw notFound('Unknown channel'); // deleted meanwhile
      const clash = findClash(current, [{ ...self, name }]);
      if (clash) throw rejected(clash);
      return toChannelResponse(await locked.rename(row.id, name));
    });
    await this.events.toServer(row.serverId!, 'CHANNEL_UPDATE', channel);
    return channel;
  }

  async reorder(
    userId: bigint,
    serverId: bigint,
    body: UpdateChannelPositionsRequest,
  ): Promise<void> {
    await this.memberOf(serverId, userId);
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_CHANNELS,
    );
    const changed = await this.repo.locked(serverId, async (locked) => {
      const plan = applyPositions(locked.rows.map(toChannelResponse), body);
      if (!plan.ok) throw rejected(plan);
      await locked.move(plan.changed.map(toMove));
      return plan.changed;
    });
    for (const channel of changed)
      await this.events.toServer(serverId, 'CHANNEL_UPDATE', channel);
  }

  async remove(userId: bigint, channelId: bigint): Promise<void> {
    const row = await this.managed(userId, channelId);
    const serverId = row.serverId!;
    const { moved, welcomeCleared } = await this.repo.locked(
      serverId,
      async (locked) => {
        const current = locked.rows.map(toChannelResponse);
        const self = current.find((c) => c.id === row.id.toString());
        if (!self) throw notFound('Unknown channel'); // deleted meanwhile
        let moved: ChannelResponse[] = [];
        if (self.type === 'category') {
          const plan = planCategoryDelete(current, self);
          if (!plan.ok) throw rejected(plan);
          moved = plan.moved;
        }
        const welcomeCleared = await locked.softDelete(
          row,
          moved.map(toMove),
          this.clock.now(),
        );
        return { moved, welcomeCleared };
      },
    );
    await this.events.toServer(serverId, 'CHANNEL_DELETE', {
      id: row.id.toString(),
      server_id: serverId.toString(),
    });
    for (const channel of moved)
      await this.events.toServer(serverId, 'CHANNEL_UPDATE', channel);
    if (welcomeCleared)
      await this.events.toServer(
        serverId,
        'SERVER_UPDATE',
        toServerSummary((await this.servers.summary(serverId))!),
      );
  }

  // 40401 for a server that does not exist and for one the caller is not in.
  private async memberOf(serverId: bigint, userId: bigint) {
    const server = await this.servers.summary(serverId);
    if (!server || !(await this.servers.isMember(serverId, userId)))
      throw notFound('Unknown server');
    return server;
  }

  // A live server channel the caller is in; MANAGE_CHANNELS there (overwrites apply).
  private async managed(
    userId: bigint,
    channelId: bigint,
  ): Promise<ChannelRow> {
    const row = await this.servers.findChannel(channelId);
    if (
      !row?.serverId ||
      !(await this.servers.isMember(row.serverId, userId)) ||
      !(await this.permissions.can(
        userId,
        { channelId },
        Permission.VIEW_CHANNEL,
      ))
    )
      throw notFound('Unknown channel');
    await this.permissions.require(
      userId,
      { channelId },
      Permission.MANAGE_CHANNELS,
    );
    return row;
  }
}
