import {
  DEFAULT_EVERYONE_PERMISSIONS,
  ErrorCode,
  ServerName,
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

const fail = (status: number, code: number) =>
  new ApiError(status, { code, message: `fake ${code}` });

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

  return {
    summaries: () => [...servers.values()].map(toSummary),
    async getServer(serverId) {
      await wait();
      const server = servers.get(serverId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      return server;
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
