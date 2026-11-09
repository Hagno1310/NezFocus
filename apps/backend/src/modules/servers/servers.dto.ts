import {
  toPermissionBitmap,
  type ChannelResponse,
  type ChannelType,
  type FocusControl,
  type RoleResponse,
  type ServerResponse,
  type ServerSummary,
  type ServerTemplate,
} from '@nezfocus/shared';
import type { FullServer, ServerWithCount } from './servers.repository.js';
import type { ChannelRow, RoleRow } from './servers.schema.js';

const CHANNEL_TYPES: readonly ChannelType[] = ['category', 'text', 'voice'];

export const toServerSummary = (s: ServerWithCount): ServerSummary => ({
  id: s.id.toString(),
  name: s.name,
  icon_url: null, // ponytail: server icons land with P1-A4.7 (#211)
  owner_id: s.ownerId.toString(),
  template: s.template as ServerTemplate,
  system_channel_id: s.systemChannelId?.toString() ?? null,
  member_count: s.memberCount,
  created_at: s.createdAt.toISOString(),
});

export const toChannelResponse = (c: ChannelRow): ChannelResponse => ({
  id: c.id.toString(),
  server_id: c.serverId!.toString(),
  type: CHANNEL_TYPES[c.type]!,
  name: c.name ?? '',
  parent_id: c.parentId?.toString() ?? null,
  position: c.position,
  focus_control: c.focusControl as FocusControl,
  permissions_synced: c.permissionsSynced,
  permission_overwrites: [], // ponytail: overwrites are stored with P1-A3.4 (#67)
});

export const toRoleResponse = (r: RoleRow): RoleResponse => ({
  id: r.id.toString(),
  name: r.name,
  permissions: toPermissionBitmap(r.permissions),
  position: r.position,
  is_mentionable: false, // ponytail: the column lands with P1-A3.3 (#66)
});

export const toServerResponse = (s: FullServer): ServerResponse => ({
  ...toServerSummary(s),
  channels: s.channels.map(toChannelResponse),
  roles: s.roles.map(toRoleResponse),
  me: { role_ids: s.myRoleIds.map(String) },
});
