import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  MAX_SERVERS_PER_USER,
  Permission,
  type CreateServerRequest,
  type ServerResponse,
  type ServerSummary,
  type UpdateServerRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionService } from '../permissions/permission.service.js';
import { buildServer } from './server-templates.js';
import {
  toChannelResponse,
  toServerResponse,
  toServerSummary,
} from './servers.dto.js';
import { ServersRepository } from './servers.repository.js';
import { ChannelTypeCode } from './servers.schema.js';

const invalid = (field: string, code: string, message: string) =>
  new AppError(ErrorCode.ValidationError, message, {
    [field]: [{ code, message }],
  });
const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown server');

// REQ-SRV-01: create a server from a template; Owner edits its name and kênh tin chào mừng.
@Injectable()
export class ServersService {
  constructor(
    private readonly repo: ServersRepository,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
    private readonly permissions: PermissionService,
  ) {}

  async create(
    userId: bigint,
    body: CreateServerRequest,
  ): Promise<ServerResponse> {
    // ponytail: the Study Server template (REQ-STUDY-05) opens to the API in P4-A2 (#168).
    if (body.template === 'study_server')
      throw invalid(
        'template',
        'NOT_AVAILABLE',
        'The Study Server template is not available yet',
      );
    const rows = buildServer(body.template, {
      name: body.name,
      ownerId: userId,
      now: this.clock.now(),
      nextId: () => this.ids.next(),
    });
    if (!(await this.repo.create(rows, MAX_SERVERS_PER_USER)))
      throw new AppError(
        ErrorCode.MaxServersReached,
        `Already in ${MAX_SERVERS_PER_USER} servers`,
      );
    const server = toServerResponse(
      (await this.repo.findForMember(rows.server.id!, userId))!,
    );
    await this.events.toUser(userId, 'SERVER_CREATE', server);
    return server;
  }

  async get(userId: bigint, serverId: bigint): Promise<ServerResponse> {
    const server = await this.repo.findForMember(serverId, userId);
    if (!server) throw notFound();
    const visible = [];
    for (const channel of server.channels)
      if (
        await this.permissions.can(
          userId,
          { channelId: channel.id },
          Permission.VIEW_CHANNEL,
        )
      )
        visible.push(channel);
    return {
      ...toServerResponse(server),
      channels: visible.map(toChannelResponse),
    };
  }

  async update(
    userId: bigint,
    serverId: bigint,
    body: UpdateServerRequest,
  ): Promise<ServerSummary> {
    if (!(await this.repo.isMember(serverId, userId))) throw notFound();
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_SERVER,
    );
    const welcome = body.system_channel_id;
    if (welcome) {
      const channel = await this.repo.findChannel(BigInt(welcome));
      if (
        channel?.serverId !== serverId ||
        channel.type !== ChannelTypeCode.text
      )
        throw invalid(
          'system_channel_id',
          'NOT_A_TEXT_CHANNEL',
          'The welcome channel must be a text channel of this server',
        );
    }
    await this.repo.update(serverId, {
      name: body.name,
      systemChannelId: welcome == null ? welcome : BigInt(welcome),
    });
    const server = toServerSummary((await this.repo.summary(serverId))!);
    await this.events.toServer(serverId, 'SERVER_UPDATE', server);
    return server;
  }

  async summariesFor(userId: bigint): Promise<ServerSummary[]> {
    return (await this.repo.summariesForUser(userId)).map(toServerSummary);
  }
}
