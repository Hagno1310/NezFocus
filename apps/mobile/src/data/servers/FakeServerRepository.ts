import {
  CreateChannelRequest,
  DEFAULT_EVERYONE_PERMISSIONS,
  ErrorCode,
  FreeChannelName,
  MAX_CHANNELS_PER_SERVER,
  MAX_ROLES_PER_SERVER,
  RoleName,
  ServerName,
  applyPositions,
  describeDuplicate,
  duplicateNameMessage,
  duplicateRoleMessage,
  findDuplicateChannel,
  findDuplicateRole,
  keepHiddenPermissions,
  newRolePlace,
  normalizeTextChannelName,
  parsePermissionBitmap,
  permissionBits,
  planCategoryDelete,
  planRoleReorder,
  privateChannelOverwrites,
  toPermissionBitmap,
  type ChannelResponse,
  type RoleResponse,
  type ServerResponse,
  type ServerSummary,
  type ServerTemplate,
} from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { ApiError } from '../api/client';
import { fakeUploadedUri } from '../attachments/FakeAttachmentRepository';

// EXPO_PUBLIC_FAKE=servers (WORKFLOW 4.2): An (id 1) owns the three sample servers of
// docs/design/screens/02-home-chat.md › Dữ liệu mẫu and creates servers from the general
// template. With EXPO_PUBLIC_FAKE=gateway too, READY lists the samples.
export const FAKE_FULL_NAME = 'Đủ 100 server'; // shows create-error 40011
export const FAKE_NETWORK_NAME = 'Mất kết nối'; // shows create-error, network sentence
export const FAKE_FORBIDDEN_NAME = 'Hết quyền'; // S-SET-01: saving it plays 40302
export const FAKE_OUTRANKED_NAME = 'Ngang bạn'; // S-SET-02: saving it plays 40301

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
      // SRS 8.5.3: #thong-bao has its own @everyone deny SEND_MESSAGES.
      permissions_synced: name !== 'thong-bao',
      permission_overwrites:
        name === 'thong-bao'
          ? [
              {
                target_id: summary.id,
                target_type: 'role',
                allow: '0',
                deny: toPermissionBitmap(permissionBits('SEND_MESSAGES')),
              },
            ]
          : [],
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
        is_mentionable: false,
      },
    ],
    me: { role_ids: [] },
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

const toSummary = ({
  channels: _c,
  roles: _r,
  me: _m,
  ...summary
}: ServerResponse) => summary;

// Spec 08 › Quy ước chung for "Ôn thi Giải tích 2": An holds Trưởng nhóm.
const SAMPLE_ROLES: [string, number, bigint, number][] = [
  ['Điều phối phòng học', 1, permissionBits('MANAGE_STUDY_ROOMS'), 1],
  [
    'Trưởng nhóm',
    2,
    permissionBits(
      'MANAGE_STUDY_ROOMS',
      'MANAGE_TASKS',
      'MANAGE_EVENTS',
      'MANAGE_MESSAGES',
      'MODERATE_MEMBERS',
      'KICK_MEMBERS',
    ),
    2,
  ],
  [
    'Quản trị',
    3,
    permissionBits(
      'MANAGE_ROLES',
      'MANAGE_CHANNELS',
      'KICK_MEMBERS',
      'BAN_MEMBERS',
      'MODERATE_MEMBERS',
      'MANAGE_MESSAGES',
    ),
    1,
  ],
];

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
  const counts = new Map<string, number>(); // role id → members holding it
  {
    const study = servers.get('100')!;
    const roles = SAMPLE_ROLES.map(([name, position, perms, count]) => {
      const role = {
        id: id(),
        name,
        position,
        permissions: toPermissionBitmap(perms),
        is_mentionable: false,
      };
      counts.set(role.id, count);
      return role;
    });
    servers.set('100', {
      ...study,
      roles: [...study.roles, ...roles],
      me: { role_ids: [roles[1]!.id] },
    });
  }
  const setRoles = (server: ServerResponse, roles: RoleResponse[]) =>
    servers.set(server.id, { ...server, roles });
  const serverFor = (serverId: string) => {
    const server = servers.get(serverId);
    if (!server) throw fail(404, ErrorCode.NotFound);
    return server;
  };
  // REQ-ROLE-01 name rules, as RolesService sends them.
  const checkName = (server: ServerResponse, raw: string, self?: string) => {
    if (raw === FAKE_NETWORK_NAME)
      throw new TypeError('Network request failed');
    if (raw === FAKE_FORBIDDEN_NAME) throw fail(403, ErrorCode.Forbidden);
    if (raw === FAKE_OUTRANKED_NAME)
      throw fail(403, ErrorCode.InsufficientRoleHierarchy);
    const parsed = RoleName.safeParse(raw);
    if (!parsed.success) throw invalid('name', 'RESERVED_NAME');
    const clash = findDuplicateRole(server.roles, {
      id: self,
      name: parsed.data,
    });
    if (clash)
      throw invalid('name', 'DUPLICATE_NAME', duplicateRoleMessage(clash));
    return parsed.data;
  };

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
    async listRoles(serverId) {
      await wait();
      const server = serverFor(serverId);
      return [...server.roles]
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
          ...r,
          member_count:
            r.id === serverId ? server.member_count : (counts.get(r.id) ?? 0),
        }));
    },
    async createRole(serverId, body) {
      await wait();
      const server = serverFor(serverId);
      const name = checkName(server, body.name);
      if (server.roles.length >= MAX_ROLES_PER_SERVER)
        throw invalid('_', 'MAX_ROLES');
      // The fake caller is An, the Owner: the new role goes on top.
      const place = newRolePlace(serverId, server.roles, null);
      const role = {
        id: id(),
        name,
        position: place.position,
        permissions: '0',
        is_mentionable: false,
      };
      setRoles(server, [...server.roles, role]);
      return role;
    },
    async updateRole(serverId, roleId, body) {
      await wait();
      const server = serverFor(serverId);
      const role = server.roles.find((r) => r.id === roleId);
      if (!role) throw fail(404, ErrorCode.NotFound);
      const next = { ...role };
      if (body.name !== undefined) {
        if (roleId === serverId) throw invalid('name', 'EVERYONE');
        next.name = checkName(server, body.name, roleId);
      }
      if (body.is_mentionable !== undefined)
        next.is_mentionable = body.is_mentionable;
      if (body.permissions !== undefined)
        next.permissions = toPermissionBitmap(
          keepHiddenPermissions(
            parsePermissionBitmap(role.permissions),
            parsePermissionBitmap(body.permissions),
          ),
        );
      setRoles(
        server,
        server.roles.map((r) => (r.id === roleId ? next : r)),
      );
      return next;
    },
    async deleteRole(serverId, roleId) {
      await wait();
      const server = serverFor(serverId);
      if (roleId === serverId) throw invalid('role_id', 'EVERYONE');
      if (!server.roles.some((r) => r.id === roleId))
        throw fail(404, ErrorCode.NotFound);
      setRoles(
        server,
        server.roles.filter((r) => r.id !== roleId),
      );
      servers.set(serverId, {
        ...servers.get(serverId)!,
        me: {
          role_ids: server.me.role_ids.filter((r) => r !== roleId),
        },
      });
    },
    async setRolePositions(serverId, body) {
      await wait();
      const server = serverFor(serverId);
      const plan = planRoleReorder(serverId, server.roles, body, null);
      if (!plan.ok) throw invalid('id', 'UNKNOWN_ROLE');
      const moved = new Map(plan.changed.map((p) => [p.id, p.position]));
      setRoles(
        server,
        server.roles.map((r) => ({
          ...r,
          position: moved.get(r.id) ?? r.position,
        })),
      );
    },
    async createChannel(serverId, raw) {
      await wait();
      const server = servers.get(serverId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      playErrors(raw.name);
      const parsed = CreateChannelRequest.safeParse(raw);
      if (!parsed.success) throw invalid('name', 'INVALID');
      const body = parsed.data;
      const parent_id = body.type === 'category' ? null : body.parent_id;
      const viewers =
        body.type === 'category' ? undefined : body.viewer_role_ids;
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
        permissions_synced:
          body.type === 'category' || (parent_id !== null && !viewers),
        // v1.9 CR-17: private at creation, from the category's overwrites.
        permission_overwrites: viewers
          ? privateChannelOverwrites(
              serverId,
              server.channels.find((c) => c.id === parent_id)
                ?.permission_overwrites ?? [],
              viewers,
            )
          : [],
      };
      setChannels(server, [...server.channels, channel]);
      return channel;
    },
    async updateChannel(channelId, body) {
      await wait();
      const server = serverOf(channelId);
      const channel = server?.channels.find((c) => c.id === channelId);
      if (!server || !channel) throw fail(404, ErrorCode.NotFound);
      // REQ-ROLE-03 v1.7: off copies the category's overwrites, on drops the channel's own.
      if (body.name === undefined) {
        const synced = body.permissions_synced!;
        const parent = server.channels.find((c) => c.id === channel.parent_id);
        if (channel.type === 'category' || !parent)
          throw invalid('permissions_synced', 'NO_CATEGORY');
        const next = {
          ...channel,
          permissions_synced: synced,
          permission_overwrites: synced ? [] : parent.permission_overwrites,
        };
        setChannels(
          server,
          server.channels.map((c) => (c.id === channelId ? next : c)),
        );
        return next;
      }
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
    async setChannelPermission(channelId, targetId, body) {
      await wait();
      const server = serverOf(channelId);
      const channel = server?.channels.find((c) => c.id === channelId);
      if (!server || !channel) throw fail(404, ErrorCode.NotFound);
      if (channel.type !== 'category' && channel.permissions_synced)
        throw invalid('_', 'SYNCED');
      const next = { target_id: targetId, ...body };
      const same = (o: { target_id: string; target_type: string }) =>
        o.target_id === targetId && o.target_type === body.target_type;
      setChannels(
        server,
        server.channels.map((c) =>
          c.id === channelId
            ? {
                ...c,
                permission_overwrites: [
                  ...c.permission_overwrites.filter((o) => !same(o)),
                  next,
                ],
              }
            : c,
        ),
      );
      return next;
    },
    async deleteChannelPermission(channelId, targetId) {
      await wait();
      const server = serverOf(channelId);
      if (!server) throw fail(404, ErrorCode.NotFound);
      setChannels(
        server,
        server.channels.map((c) =>
          c.id === channelId
            ? {
                ...c,
                permission_overwrites: c.permission_overwrites.filter(
                  (o) => o.target_id !== targetId,
                ),
              }
            : c,
        ),
      );
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
      const icon = body.icon_attachment_id;
      const next = {
        ...server,
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(welcome !== undefined && { system_channel_id: welcome }),
        ...(icon !== undefined && {
          icon_url: icon === null ? null : (fakeUploadedUri(icon) ?? null),
        }),
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
      if (body.icon_attachment_id)
        server.icon_url = fakeUploadedUri(body.icon_attachment_id) ?? null;
      servers.set(server.id, server);
      return server;
    },
  };
}

export const fakeServerRepository = createFakeServerRepository();
