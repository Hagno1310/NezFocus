import {
  CreateChannelRequest,
  DEFAULT_EVERYONE_PERMISSIONS,
  ErrorCode,
  FreeChannelName,
  MAX_CHANNELS_PER_SERVER,
  ServerName,
  applyPositions,
  describeDuplicate,
  duplicateNameMessage,
  findDuplicateChannel,
  normalizeTextChannelName,
  planCategoryDelete,
  toPermissionBitmap,
  type ChannelResponse,
  type ServerResponse,
  type ServerSummary,
  type ServerTemplate,
} from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { ApiError } from '../api/client';

// EXPO_PUBLIC_FAKE=servers (WORKFLOW 4.2): An (id 1) owns the three sample servers of
// docs/design/screens/02-home-chat.md › Dữ liệu mẫu and creates servers from the general
// template. With EXPO_PUBLIC_FAKE=gateway too, READY lists the samples.
export const FAKE_FULL_NAME = 'Đủ 100 server'; // shows create-error 40011
export const FAKE_NETWORK_NAME = 'Mất kết nối'; // shows create-error, network sentence
export const FAKE_FORBIDDEN_NAME = 'Hết quyền'; // S-SET-01: saving it plays 40302

const fail = (status: number, code: number) =>
  new ApiError(status, { code, message: `fake ${code}` });

// 40001 with one field error, as the backend sends it (SRS 5.2).
const invalid = (field: string, code: string, message = `fake ${code}`) =>
  new ApiError(400, {
    code: ErrorCode.ValidationError,
    message,
    errors: { [field]: [{ code, message }] },
  });

// The backend's sentence (Vietnamese only; the app shows its own when it can).
const duplicate = (
  channels: readonly ChannelResponse[],
  existing: ChannelResponse,
) =>
  invalid(
    'name',
    'DUPLICATE_NAME',
    duplicateNameMessage(describeDuplicate(channels, existing)),
  );

type Plan = [ChannelResponse['type'], string, Plan[]?];

// REQ-SRV-01 / REQ-STUDY-05 templates, as the backend builds them.
const TEMPLATES: Record<ServerTemplate, Plan[]> = {
  general: [
    [
      'category',
      'Kênh chung',
      [
        ['text', 'general'],
        ['voice', 'Phòng thoại chung'],
      ],
    ],
  ],
  study_server: [
    [
      'category',
      'THÔNG TIN',
      ['chao-mung', 'thong-bao', 'tai-lieu', 'hoi-dap', 'viec-nhom'].map(
        (name): Plan => ['text', name],
      ),
    ],
    [
      'category',
      'PHÒNG HỌC',
      [
        ['voice', 'Phòng học im lặng'],
        ['voice', 'Phòng thảo luận nhóm'],
      ],
    ],
  ],
};

function buildServer(
  summary: Omit<ServerSummary, 'system_channel_id'>,
  nextId: () => string,
): ServerResponse {
  const channels: ChannelResponse[] = [];
  const add = (
    [type, name, children]: Plan,
    position: number,
    parent: string | null,
  ) => {
    const id = nextId();
    channels.push({
      id,
      server_id: summary.id,
      type,
      name,
      parent_id: parent,
      position,
      focus_control:
        type === 'voice' && summary.template === 'study_server'
          ? 'everyone'
          : 'off',
      permissions_synced: true,
    });
    children?.forEach((child, i) => add(child, i, id));
  };
  TEMPLATES[summary.template].forEach((plan, i) => add(plan, i, null));
  return {
    ...summary,
    system_channel_id: channels.find((c) => c.type === 'text')?.id ?? null,
    channels,
    roles: [
      {
        id: summary.id,
        name: '@everyone',
        permissions: toPermissionBitmap(DEFAULT_EVERYONE_PERMISSIONS),
        position: 0,
      },
    ],
  };
}

const sample = (
  id: string,
  name: string,
  template: ServerTemplate,
  member_count: number,
  created_at: string,
) => ({
  id,
  name,
  icon_url: null,
  owner_id: '1',
  template,
  member_count,
  created_at,
});

// Rail order: oldest joined first. "Ôn thi Giải tích 2" is the server of every frame.
const SAMPLES = [
  sample(
    '100',
    'Ôn thi Giải tích 2',
    'study_server',
    24,
    '2026-10-01T01:00:00.000Z',
  ),
  sample(
    '200',
    'Nhóm đồ án Mobile',
    'study_server',
    4,
    '2026-10-05T01:00:00.000Z',
  ),
  sample('300', 'CLB Guitar PTIT', 'general', 3, '2026-10-10T01:00:00.000Z'),
];

const toSummary = ({ channels: _c, roles: _r, ...summary }: ServerResponse) =>
  summary;

export function createFakeServerRepository(
  delayMs = 600,
  now: () => Date = () => new Date(),
): ServerRepository & { summaries(): ServerSummary[] } {
  let nextId = 1000;
  const id = () => String(nextId++);
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const servers = new Map(
    SAMPLES.map((s) => [s.id, buildServer(s, id)] as const),
  );

  const serverOf = (channelId: string) =>
    [...servers.values()].find((s) =>
      s.channels.some((c) => c.id === channelId),
    );
  const setChannels = (server: ServerResponse, channels: ChannelResponse[]) =>
    servers.set(server.id, { ...server, channels });
  // The names that play an error path, as on the server screens.
  const playErrors = (name: string) => {
    if (name === FAKE_NETWORK_NAME)
      throw new TypeError('Network request failed');
    if (name === FAKE_FORBIDDEN_NAME) throw fail(403, ErrorCode.Forbidden);
  };

  return {
    summaries: () => [...servers.values()].map(toSummary),
    async createChannel(serverId, raw) {
      await wait();
      const server = servers.get(serverId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      playErrors(raw.name);
      const parsed = CreateChannelRequest.safeParse(raw);
      if (!parsed.success) throw invalid('name', 'INVALID');
      const body = parsed.data;
      const parent_id = body.type === 'category' ? null : body.parent_id;
      const existing = findDuplicateChannel(server.channels, {
        type: body.type,
        name: body.name,
        parent_id,
      });
      if (existing) throw duplicate(server.channels, existing);
      if (server.channels.length >= MAX_CHANNELS_PER_SERVER)
        throw invalid('_', 'MAX_CHANNELS');
      const siblings = server.channels.filter((c) =>
        body.type === 'category'
          ? c.type === 'category'
          : c.type !== 'category' && c.parent_id === parent_id,
      );
      const channel: ChannelResponse = {
        id: id(),
        server_id: serverId,
        type: body.type,
        name: body.name,
        parent_id,
        position: Math.max(-1, ...siblings.map((c) => c.position)) + 1,
        focus_control:
          body.type === 'voice'
            ? (body.focus_control ??
              (server.template === 'study_server' ? 'everyone' : 'off'))
            : 'off',
        permissions_synced: body.type === 'category' || parent_id !== null,
      };
      setChannels(server, [...server.channels, channel]);
      return channel;
    },
    async updateChannel(channelId, body) {
      await wait();
      const server = serverOf(channelId);
      const channel = server?.channels.find((c) => c.id === channelId);
      if (!server || !channel) throw fail(404, ErrorCode.NotFound);
      playErrors(body.name);
      const free = FreeChannelName.safeParse(body.name);
      if (!free.success) throw invalid('name', 'INVALID');
      const name =
        channel.type === 'text'
          ? normalizeTextChannelName(free.data)
          : free.data;
      if (!name) throw invalid('name', 'NO_LETTER_OR_DIGIT');
      const existing = findDuplicateChannel(server.channels, {
        ...channel,
        name,
      });
      if (existing) throw duplicate(server.channels, existing);
      const next = { ...channel, name };
      setChannels(
        server,
        server.channels.map((c) => (c.id === channelId ? next : c)),
      );
      return next;
    },
    async deleteChannel(channelId) {
      await wait();
      const server = serverOf(channelId);
      const channel = server?.channels.find((c) => c.id === channelId);
      if (!server || !channel) throw fail(404, ErrorCode.NotFound);
      let channels = server.channels;
      if (channel.type === 'category') {
        const plan = planCategoryDelete(channels, channel);
        if (!plan.ok) throw invalid('name', 'DUPLICATE_NAME');
        const moved = new Map(plan.moved.map((c) => [c.id, c]));
        channels = channels.map((c) => moved.get(c.id) ?? c);
      }
      setChannels(
        server,
        channels.filter((c) => c.id !== channelId),
      );
      servers.set(server.id, {
        ...servers.get(server.id)!,
        system_channel_id:
          server.system_channel_id === channelId
            ? null
            : server.system_channel_id,
      });
    },
    async setChannelPositions(serverId, body) {
      await wait();
      const server = servers.get(serverId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      const plan = applyPositions(server.channels, body);
      if (!plan.ok) throw invalid('name', 'DUPLICATE_NAME');
      const moved = new Map(plan.changed.map((c) => [c.id, c]));
      setChannels(
        server,
        server.channels.map((c) => moved.get(c.id) ?? c),
      );
    },
    async getServer(serverId) {
      await wait();
      const server = servers.get(serverId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      return server;
    },
    async updateServer(serverId, body) {
      await wait();
      const server = servers.get(serverId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      if (body.name === FAKE_NETWORK_NAME)
        throw new TypeError('Network request failed');
      if (body.name === FAKE_FORBIDDEN_NAME)
        throw fail(403, ErrorCode.Forbidden);
      if (body.name !== undefined && !ServerName.safeParse(body.name).success)
        throw fail(400, ErrorCode.ValidationError);
      const welcome = body.system_channel_id;
      if (
        welcome &&
        !server.channels.some((c) => c.id === welcome && c.type === 'text')
      )
        throw fail(400, ErrorCode.ValidationError);
      const next = {
        ...server,
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(welcome !== undefined && { system_channel_id: welcome }),
      };
      servers.set(serverId, next);
      return toSummary(next);
    },
    async createServer(body) {
      await wait();
      if (body.name === FAKE_NETWORK_NAME)
        throw new TypeError('Network request failed');
      if (body.name === FAKE_FULL_NAME)
        throw fail(403, ErrorCode.MaxServersReached);
      if (
        !ServerName.safeParse(body.name).success ||
        body.template !== 'general'
      )
        throw fail(400, ErrorCode.ValidationError);
      const server = buildServer(
        {
          ...sample(id(), body.name.trim(), 'general', 1, now().toISOString()),
        },
        id,
      );
      servers.set(server.id, server);
      return server;
    },
  };
}

export const fakeServerRepository = createFakeServerRepository();
