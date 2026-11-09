import {
  Permission as P,
  computeBasePermissions,
  hasPermission,
  parsePermissionBitmap,
  type PermissionServer,
  type RoleResponse,
  type ServerSummary,
} from '@nezfocus/shared';

// A server as the shared 8.5.2 calculator reads it (@everyone has the server's id).
export const toPermissionServer = (
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[] | undefined,
): PermissionServer => ({
  id: server.id,
  ownerId: server.owner_id,
  roles: (roles ?? []).map((r) => ({
    id: r.id,
    permissions: parsePermissionBitmap(r.permissions),
    position: r.position,
  })),
});

// What the caller may do in a server: @everyone and the caller's roles (`me.role_ids`).
export function myServerPermissions(
  server: ServerSummary,
  roles: readonly RoleResponse[] | undefined,
  userId: string | null,
  roleIds: readonly string[] = [],
): bigint {
  if (!userId) return 0n;
  return computeBasePermissions(toPermissionServer(server, roles), {
    userId,
    roleIds: [...roleIds],
  });
}

export type SettingsRow =
  | 'overview'
  | 'roles'
  | 'members'
  | 'invites'
  | 'bans'
  | 'reports'
  | 'transfer'
  | 'delete';

const any = (perms: bigint, bits: bigint) => (perms & bits) !== 0n;

// S-SET-01 rows, each behind its permission (spec 08 › Bố cục `owner`).
export function serverSettingsRows(
  perms: bigint,
  isOwner: boolean,
): SettingsRow[] {
  const rows: SettingsRow[] = [];
  if (hasPermission(perms, P.MANAGE_SERVER)) rows.push('overview');
  if (hasPermission(perms, P.MANAGE_ROLES)) rows.push('roles');
  if (
    any(
      perms,
      P.KICK_MEMBERS | P.BAN_MEMBERS | P.MODERATE_MEMBERS | P.MANAGE_ROLES,
    )
  )
    rows.push('members');
  if (hasPermission(perms, P.MANAGE_SERVER)) rows.push('invites');
  if (hasPermission(perms, P.BAN_MEMBERS)) rows.push('bans');
  if (hasPermission(perms, P.MANAGE_MESSAGES)) rows.push('reports');
  if (isOwner) rows.push('transfer', 'delete');
  return rows;
}

export type MenuRow =
  'invite' | 'createChannel' | 'settings' | 'report' | 'leave';

// S-HOME-09: "Cài đặt server" when S-SET-01 would have a row; the Owner does not report
// their own server.
export function serverMenuRows(perms: bigint, isOwner: boolean): MenuRow[] {
  const rows: MenuRow[] = [];
  if (hasPermission(perms, P.CREATE_INVITE)) rows.push('invite');
  if (hasPermission(perms, P.MANAGE_CHANNELS)) rows.push('createChannel');
  if (serverSettingsRows(perms, isOwner).length) rows.push('settings');
  if (!isOwner) rows.push('report');
  rows.push('leave');
  return rows;
}

export type ChannelMenuRow = 'settings' | 'reorder';
type ChannelKind = 'text' | 'voice';

// S-HOME-02 `channel-menu`: MANAGE_CHANNELS, or MANAGE_STUDY_ROOMS on a voice channel
// (REQ-STUDY-11). An empty list means a long press does nothing.
// ponytail: these are server-level bits; channel overwrites count once P1-A3 (#8) gives
// the app the caller's roles and the channel's overwrites (P1-A3.6 #69).
export function channelMenuRows(
  perms: bigint,
  type: ChannelKind,
): ChannelMenuRow[] {
  if (hasPermission(perms, P.MANAGE_CHANNELS)) return ['settings', 'reorder'];
  if (type === 'voice' && hasPermission(perms, P.MANAGE_STUDY_ROOMS))
    return ['settings'];
  return [];
}

export type ChannelSettingsRow =
  'overview' | 'permissions' | 'studyRoom' | 'taskBoard';

// S-SET-06 `text` / `voice`: a manager with only MANAGE_STUDY_ROOMS sees "Phòng học" alone
// (`voice · study-rooms-only`; REQ-STUDY-11 v1.9: no rename, no other rows).
export function channelSettingsRows(
  perms: bigint,
  type: ChannelKind,
): ChannelSettingsRow[] {
  const channels = hasPermission(perms, P.MANAGE_CHANNELS);
  const rows: ChannelSettingsRow[] = [];
  if (channels) rows.push('overview');
  if (channels && hasPermission(perms, P.MANAGE_ROLES))
    rows.push('permissions');
  if (type === 'text' && channels) rows.push('taskBoard');
  if (
    type === 'voice' &&
    (channels || hasPermission(perms, P.MANAGE_STUDY_ROOMS))
  )
    rows.push('studyRoom');
  return rows;
}
