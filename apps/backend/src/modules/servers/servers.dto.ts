import {
  parsePermissionBitmap,
  toPermissionBitmap,
  type ChannelResponse,
  type ChannelType,
  type FocusControl,
  type OverwriteTargetType,
  type PermissionOverwrite,
  type RoleResponse,
  type ServerResponse,
  type ServerSummary,
  type ServerTemplate,
} from '@nezfocus/shared';
import { serverIconUrl } from '../attachments/media.js';
import type { ChannelWithOverwrites } from './channels.repository.js';
import type { FullServer, ServerWithCount } from './servers.repository.js';
import {
  OverwriteTargetCode,
  type OverwriteRow,
  type RoleRow,
} from './servers.schema.js';

// SRS 8.2 channels.type 0–2.
export const CHANNEL_TYPES: readonly ChannelType[] = [
  'category',
  'text',
  'voice',
];

export const toServerSummary = (s: ServerWithCount): ServerSummary => ({
  id: s.id.toString(),
  name: s.name,
  icon_url: serverIconUrl(s.iconKey),
  owner_id: s.ownerId.toString(),
  template: s.template as ServerTemplate,
  system_channel_id: s.systemChannelId?.toString() ?? null,
  member_count: s.memberCount,
  created_at: s.createdAt.toISOString(),
});

// SRS 8.2 channel_permission_overwrites.target_type 0–1.
const TARGET_TYPES: readonly OverwriteTargetType[] = ['role', 'member'];

export const toOverwriteResponse = (o: OverwriteRow): PermissionOverwrite => ({
  target_id: o.targetId.toString(),
  target_type: TARGET_TYPES[o.targetType]!,
  allow: toPermissionBitmap(o.allow),
  deny: toPermissionBitmap(o.deny),
});

export const toOverwriteRow = (
  channelId: bigint,
  o: PermissionOverwrite,
): OverwriteRow => ({
  channelId,
  targetId: BigInt(o.target_id),
  targetType: OverwriteTargetCode[o.target_type],
  allow: parsePermissionBitmap(o.allow),
  deny: parsePermissionBitmap(o.deny),
});

// Roles first, then members; oldest target first in each (a stable order for the app).
const byTarget = (a: OverwriteRow, b: OverwriteRow) =>
  a.targetType - b.targetType ||
  (a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0);

export const toChannelResponse = (
  c: ChannelWithOverwrites,
): ChannelResponse => ({
  id: c.id.toString(),
  server_id: c.serverId!.toString(),
  type: CHANNEL_TYPES[c.type]!,
  name: c.name ?? '',
  parent_id: c.parentId?.toString() ?? null,
  position: c.position,
  focus_control: c.focusControl as FocusControl,
  permissions_synced: c.permissionsSynced,
  permission_overwrites: [...c.overwrites]
    .sort(byTarget)
    .map(toOverwriteResponse),
});

export const toRoleResponse = (r: RoleRow): RoleResponse => ({
  id: r.id.toString(),
  name: r.name,
  permissions: toPermissionBitmap(r.permissions),
  position: r.position,
  is_mentionable: r.isMentionable,
});

export const toServerResponse = (s: FullServer): ServerResponse => ({
  ...toServerSummary(s),
  channels: s.channels.map(toChannelResponse),
  roles: s.roles.map(toRoleResponse),
  me: { role_ids: s.myRoleIds.map(String) },
});
