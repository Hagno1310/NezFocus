import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ErrorCode,
  MAX_CHANNELS_PER_SERVER,
  NO_LETTER_OR_DIGIT_MESSAGE,
  Permission,
  applyPositions,
  findClash,
  isStudyRoomSettingsOnly,
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
import { AuditLogService } from '../safety/audit-log.service.js';
import { ChannelEvents } from './channel-events.js';
import { ruleError } from './channel-rules.js';
import { ChannelsRepository, type ChannelMove } from './channels.repository.js';
import { assertCanEditTarget } from './overwrite-targets.js';
import { DmService } from '../channels/dm.service.js';
import { toChannelResponse, toServerSummary } from './servers.dto.js';
import { ServersRepository } from './servers.repository.js';
import { ChannelTypeCode, type ChannelRow } from './servers.schema.js';
import { VoiceService } from '../voice/voice.service.js';
import {
  STUDY_ROOM_DELETED,
  STUDY_ROOM_DISABLED,
  type StudyRoomDeleted,
  type StudyRoomDisabled,
} from './study-room-events.js';

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

// before / after of a channel in the audit log (REQ-ROLE-09): what its settings change.
const channelShape = (c: ChannelResponse) => ({
  name: c.name,
  type: c.type,
  parent_id: c.parent_id,
  position: c.position,
  permissions_synced: c.permissions_synced,
  focus_control: c.focus_control,
  default_cycle_config: c.default_cycle_config,
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
    private readonly dms: DmService,
    private readonly voice: VoiceService,
    private readonly emitter: EventEmitter2,
    private readonly audit: AuditLogService,
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
    await this.channelEvents.created(channel);
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId: BigInt(channel.id),
      action: 'CHANNEL_CREATE',
      changes: { after: channelShape(channel) },
    });
    return channel;
  }

  // Rename (REQ-SRV-02), the "Đồng bộ với danh mục" switch (REQ-ROLE-03 v1.7) and the
  // Phòng học settings (REQ-STUDY-11).
  async update(
    userId: bigint,
    channelId: bigint,
    body: UpdateChannelRequest,
  ): Promise<ChannelResponse> {
    const row = await this.manageable(
      userId,
      channelId,
      isStudyRoomSettingsOnly(body),
    );
    const serverId = row.serverId!;
    const touchesStudyRoom =
      body.focus_control !== undefined ||
      body.default_cycle_config !== undefined;
    // CR-28 #37: only a voice channel is a Phòng học.
    if (touchesStudyRoom && row.type !== ChannelTypeCode.voice)
      throw invalid(
        body.focus_control !== undefined
          ? 'focus_control'
          : 'default_cycle_config',
        'NOT_VOICE',
        'Only a voice channel is a Phòng học',
      );
    let name = body.name;
    if (name !== undefined && row.type === ChannelTypeCode.text) {
      name = normalizeTextChannelName(name);
      if (!name)
        throw invalid('name', 'NO_LETTER_OR_DIGIT', NO_LETTER_OR_DIGIT_MESSAGE);
    }
    const { channel, resynced, turnedOff } = await this.repo.locked(
      serverId,
      async (locked) => {
        const current = locked.rows.map(toChannelResponse);
        const self = current.find((c) => c.id === row.id.toString());
        if (!self) throw notFound('Unknown channel'); // deleted meanwhile
        if (touchesStudyRoom)
          await locked.update(row.id, {
            focusControl: body.focus_control,
            defaultCycleConfig: body.default_cycle_config,
          });
        const turnedOff =
          body.focus_control === 'off' && self.focus_control !== 'off';
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
          turnedOff,
        };
      },
    );
    if (resynced) await this.permissionCache.invalidateServer(serverId);
    await this.channelEvents.updated(serverId, [channel], { by: userId });
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId: row.id,
      action: 'CHANNEL_UPDATE',
      changes: {
        before: channelShape(toChannelResponse({ ...row, overwrites: [] })),
        after: channelShape(channel),
      },
    });
    if (turnedOff)
      await this.emitter.emitAsync(STUDY_ROOM_DISABLED, {
        serverId,
        channelId: row.id,
        byUserId: userId,
      } satisfies StudyRoomDisabled);
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
    if (changed.length)
      await this.audit.record({
        serverId,
        actorId: userId,
        action: 'CHANNEL_UPDATE',
        changes: {
          after: changed.map((c) => ({
            id: c.id,
            parent_id: c.parent_id,
            position: c.position,
          })),
        },
      });
  }

  async remove(userId: bigint, channelId: bigint): Promise<void> {
    // SRS 5.3 (CR-28): on a DM 1-1 the same route only closes it for the caller.
    if (await this.dms.close(userId, channelId)) return;
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
    if (row.type === ChannelTypeCode.voice) {
      // The session ends first, so nobody's leave counts as an emptying room.
      await this.emitter.emitAsync(STUDY_ROOM_DELETED, {
        serverId,
        channelId: row.id,
        byUserId: userId,
      } satisfies StudyRoomDeleted);
      await this.voice.roomDeleted(serverId, row.id);
    }
    await this.events.toServer(serverId, 'CHANNEL_DELETE', {
      id: row.id.toString(),
      server_id: serverId.toString(),
    });
    await this.audit.record({
      serverId,
      actorId: userId,
      targetId: row.id,
      action: 'CHANNEL_DELETE',
      changes: {
        before: channelShape(toChannelResponse({ ...row, overwrites: [] })),
      },
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
  // REQ-STUDY-11 AC8: for Phòng học fields alone, MANAGE_STUDY_ROOMS on a voice channel will do.
  async manageable(
    userId: bigint,
    channelId: bigint,
    studyRoomOnly = false,
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
    if (
      studyRoomOnly &&
      row.type === ChannelTypeCode.voice &&
      (await this.permissions.can(
        userId,
        { channelId },
        Permission.MANAGE_STUDY_ROOMS,
      ))
    )
      return row;
    await this.permissions.require(
      userId,
      { channelId },
      Permission.MANAGE_CHANNELS,
    );
    return row;
  }
}
