import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  MAX_CHANNELS_PER_SERVER,
  NO_LETTER_OR_DIGIT_MESSAGE,
  Permission,
  applyPositions,
  findClash,
  planCategoryDelete,
  privateChannelOverwrites,
  type ChannelRuleError,
  normalizeTextChannelName,
  type ChannelResponse,
  type CreateChannelRequest,
  type PermissionOverwrite,
  type UpdateChannelPositionsRequest,
  type UpdateChannelRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ChannelEvents } from './channel-events.js';
import { ruleError } from './channel-rules.js';
import { ChannelsRepository, type ChannelMove } from './channels.repository.js';
import { assertCanEditTarget } from './overwrite-targets.js';
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

// `before` is the channel as it was: one that stopped following its category keeps the
// overwrites the rules handed it (REQ-ROLE-03 v1.8).
const toMove = (c: ChannelResponse, before?: ChannelResponse): ChannelMove => ({
  id: BigInt(c.id),
  position: c.position,
  parentId: c.parent_id === null ? null : BigInt(c.parent_id),
  permissionsSynced: c.permissions_synced,
  overwrites:
    before?.permissions_synced && !c.permissions_synced
      ? c.permission_overwrites
      : undefined,
});

// REQ-SRV-02: categories, text and voice channels; names, order, delete. CHANNEL_CREATE /
// UPDATE go through ChannelEvents (viewers only); CHANNEL_DELETE goes to every member.
@Injectable()
export class ChannelsService {
  constructor(
    private readonly repo: ChannelsRepository,
    private readonly servers: ServersRepository,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
    private readonly permissions: PermissionService,
    private readonly permissionCache: PermissionCache,
    private readonly channelEvents: ChannelEvents,
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
    const parentId = body.type === 'category' ? null : body.parent_id;
    const viewers = body.type === 'category' ? undefined : body.viewer_role_ids;
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
      let overwrites: PermissionOverwrite[] = [];
      if (viewers) {
        const { roles } = await locked.people(serverId, []);
        const known = new Set(
          roles.filter((r) => r.id !== serverId).map((r) => r.id.toString()),
        );
        if (viewers.some((id) => !known.has(id)))
          throw invalid(
            'viewer_role_ids',
            'UNKNOWN_ROLE',
            'Viewers are roles of this server, not @everyone',
          );
        const parent = current.find((c) => c.id === parentId);
        overwrites = privateChannelOverwrites(
          serverId.toString(),
          parent?.permission_overwrites ?? [],
          viewers,
        );
      }
      return toChannelResponse(
        await locked.create(
          {
            id: this.ids.next(),
            serverId,
            parentId: parentId === null ? null : BigInt(parentId),
            type: ChannelTypeCode[body.type],
            name: body.name,
            focusControl,
            // Nothing to follow outside a category (REQ-ROLE-03 v1.8), nor when private (v1.9).
            permissionsSynced:
              body.type === 'category' || (parentId !== null && !viewers),
            createdAt: this.clock.now(),
          },
          overwrites,
        ),
      );
    });
    await this.channelEvents.created(serverId, channel);
    return channel;
  }

  // Rename (REQ-SRV-02) and the "Đồng bộ với danh mục" switch (REQ-ROLE-03 v1.7).
  async update(
    userId: bigint,
    channelId: bigint,
    body: UpdateChannelRequest,
  ): Promise<ChannelResponse> {
    const row = await this.manageable(userId, channelId);
    const serverId = row.serverId!;
    let name = body.name;
    if (name !== undefined && row.type === ChannelTypeCode.text) {
      name = normalizeTextChannelName(name);
      if (!name)
        throw invalid('name', 'NO_LETTER_OR_DIGIT', NO_LETTER_OR_DIGIT_MESSAGE);
    }
    const { channel, resynced } = await this.repo.locked(
      serverId,
      async (locked) => {
        const current = locked.rows.map(toChannelResponse);
        const self = current.find((c) => c.id === row.id.toString());
        if (!self) throw notFound('Unknown channel'); // deleted meanwhile
        if (name !== undefined) {
          const clash = findClash(current, [{ ...self, name }]);
          if (clash) throw rejected(clash);
          await locked.update(row.id, { name });
        }
        const synced = body.permissions_synced;
        const resynced =
          synced !== undefined && synced !== self.permissions_synced;
        if (resynced) {
          const parent = current.find((c) => c.id === self.parent_id);
          if (self.type === 'category' || !parent)
            throw invalid(
              'permissions_synced',
              self.type === 'category' ? 'CATEGORY' : 'NO_CATEGORY',
              'Only a channel in a category follows it',
            );
          // On drops the channel's own overwrites: each one must be below the caller (8.5.2).
          if (synced && self.permission_overwrites.length) {
            const people = await locked.people(serverId, [
              userId,
              ...self.permission_overwrites
                .filter((o) => o.target_type === 'member')
                .map((o) => BigInt(o.target_id)),
            ]);
            for (const o of self.permission_overwrites)
              assertCanEditTarget(serverId, people, userId, o);
          }
          // Off: the category's overwrites are where the channel's own start.
          await locked.update(row.id, { permissionsSynced: synced });
          await locked.replaceOverwrites(
            row.id,
            synced ? [] : parent.permission_overwrites,
          );
        }
        return {
          channel: toChannelResponse((await locked.reload(row.id))!),
          resynced,
        };
      },
    );
    if (resynced) await this.permissionCache.invalidateServer(serverId);
    await this.channelEvents.updated(serverId, [channel]);
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
      const current = locked.rows.map(toChannelResponse);
      const plan = applyPositions(current, body);
      if (!plan.ok) throw rejected(plan);
      const before = new Map(current.map((c) => [c.id, c]));
      await locked.move(plan.changed.map((c) => toMove(c, before.get(c.id))));
      return plan.changed;
    });
    // A synced channel follows its new category's overwrites.
    await this.permissionCache.invalidateServer(serverId);
    await this.channelEvents.updated(serverId, changed);
  }

  async remove(userId: bigint, channelId: bigint): Promise<void> {
    const row = await this.manageable(userId, channelId);
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
          moved.map((c) =>
            toMove(
              c,
              current.find((x) => x.id === c.id),
            ),
          ),
          this.clock.now(),
        );
        return { moved, welcomeCleared };
      },
    );
    await this.permissionCache.invalidateServer(serverId); // its children left the category
    await this.events.toServer(serverId, 'CHANNEL_DELETE', {
      id: row.id.toString(),
      server_id: serverId.toString(),
    });
    await this.channelEvents.updated(serverId, moved);
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

  // A live server channel the caller sees (else 40401) with MANAGE_CHANNELS there
  // (overwrites apply, else 40302). Also the gate of the overwrite writes.
  async manageable(userId: bigint, channelId: bigint): Promise<ChannelRow> {
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
