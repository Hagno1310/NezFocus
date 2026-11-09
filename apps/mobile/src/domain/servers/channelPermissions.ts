import {
  ALL_PERMISSIONS,
  Permission,
  canEditOverwrite,
  computeBasePermissions,
  computeChannelPermissions,
  hasPermission,
  parsePermissionBitmap,
  permissionNames,
  toPermissionBitmap,
  toPermissionOverwrite,
  type ChannelResponse,
  type ChannelType,
  type PermissionMember,
  type PermissionName,
  type PermissionOverwrite,
  type RoleResponse,
  type ServerSummary,
} from '@nezfocus/shared';
import { toPermissionServer } from './serverAccess';

// S-SET-06 `overwrites` / `overwrite-edit` and S-SET-09 `private-roles` (REQ-ROLE-03,
// REQ-SRV-02 v1.9) over the shared 8.5.2 calculator. The backend checks the same.

export type Tri = 'deny' | 'default' | 'allow';

// The rows of `overwrite-edit` (text) and `overwrite-edit-voice`; a category has both, since
// its synced channels of either kind use it. No "Đọc tin cũ" (CR-14).
const TEXT_ROWS: PermissionName[] = [
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'ATTACH_FILES',
  'EMBED_LINKS',
  'ADD_REACTIONS',
  'MENTION_EVERYONE',
  'MANAGE_MESSAGES',
  'CREATE_TASKS',
  'MANAGE_TASKS',
];
const VOICE_ROWS: PermissionName[] = [
  'VIEW_CHANNEL',
  'CONNECT',
  'SPEAK',
  'VIDEO',
  'SEND_MESSAGES', // "Gửi tin trong chat phòng"
  'MANAGE_STUDY_ROOMS',
  'MUTE_MEMBERS',
  'MOVE_MEMBERS',
];

export const overwritePermissions = (type: ChannelType): PermissionName[] =>
  type === 'text'
    ? TEXT_ROWS
    : type === 'voice'
      ? VOICE_ROWS
      : [...TEXT_ROWS, ...VOICE_ROWS.filter((p) => !TEXT_ROWS.includes(p))];

type Bits = Pick<PermissionOverwrite, 'allow' | 'deny'>;

export function triOf(o: Bits | undefined, name: PermissionName): Tri {
  if (!o) return 'default';
  const bit = Permission[name];
  if (hasPermission(parsePermissionBitmap(o.allow), bit)) return 'allow';
  if (hasPermission(parsePermissionBitmap(o.deny), bit)) return 'deny';
  return 'default';
}

export function withTri(o: Bits | undefined, name: PermissionName, tri: Tri) {
  const bit = Permission[name];
  let allow = parsePermissionBitmap(o?.allow ?? '0') & ~bit;
  let deny = parsePermissionBitmap(o?.deny ?? '0') & ~bit;
  if (tri === 'allow') allow |= bit;
  if (tri === 'deny') deny |= bit;
  return { allow: toPermissionBitmap(allow), deny: toPermissionBitmap(deny) };
}

// "2 cho phép · 1 từ chối"
export const overwriteSummary = (o: Bits) => ({
  allow: permissionNames(parsePermissionBitmap(o.allow) & ALL_PERMISSIONS)
    .length,
  deny: permissionNames(parsePermissionBitmap(o.deny) & ALL_PERMISSIONS).length,
});

const rankOf = (roles: readonly RoleResponse[], id: string) =>
  roles.find((r) => r.id === id)?.position ?? -1;

// What the screen lists: the category's while synced; @everyone first, then roles highest
// first, then members.
export function shownOverwrites(
  channel: ChannelResponse,
  channels: readonly ChannelResponse[],
  roles: readonly RoleResponse[],
): PermissionOverwrite[] {
  const parent = channels.find((c) => c.id === channel.parent_id);
  const list =
    channel.type !== 'category' && channel.permissions_synced && parent
      ? parent.permission_overwrites
      : channel.permission_overwrites;
  const key = (o: PermissionOverwrite) =>
    o.target_type === 'member'
      ? -2
      : o.target_id === channel.server_id
        ? Number.MAX_SAFE_INTEGER
        : rankOf(roles, o.target_id);
  return [...list].sort((a, b) => key(b) - key(a));
}

// The caller's permissions in one channel, overwrites included.
export function myChannelPermissions(
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[],
  userId: string,
  roleIds: readonly string[],
  channel: ChannelResponse,
  channels: readonly ChannelResponse[],
): bigint {
  const s = toPermissionServer(server, roles);
  const member = { userId, roleIds: [...roleIds] };
  const parent = channels.find((c) => c.id === channel.parent_id);
  return computeChannelPermissions(s, member, {
    type: channel.type,
    overwrites: channel.permission_overwrites.map(toPermissionOverwrite),
    permissionsSynced: channel.permissions_synced,
    parent: parent
      ? { overwrites: parent.permission_overwrites.map(toPermissionOverwrite) }
      : null,
  });
}

const ranked = (serverId: string, roles: readonly RoleResponse[]) => [
  ...roles
    .filter((r) => r.id !== serverId)
    .sort((a, b) => b.position - a.position || a.id.localeCompare(b.id)),
  ...roles.filter((r) => r.id === serverId),
];

const editable = (
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[],
  actor: PermissionMember,
  role: RoleResponse,
) =>
  canEditOverwrite(toPermissionServer(server, roles), actor, {
    type: 'role',
    role: {
      id: role.id,
      permissions: parsePermissionBitmap(role.permissions),
      position: role.position,
    },
  });

// May the caller change this target's overwrite (8.5.2: only below their highest)?
export function canEditTarget(
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[],
  actor: PermissionMember,
  o: Pick<PermissionOverwrite, 'target_id' | 'target_type'>,
): boolean {
  const s = toPermissionServer(server, roles);
  if (o.target_type === 'member')
    // ponytail: a member's own roles come with the member list, P2-A2 (#15).
    return canEditOverwrite(s, actor, {
      type: 'member',
      member: { userId: o.target_id, roleIds: [] },
    });
  const role = roles.find((r) => r.id === o.target_id);
  return !!role && editable(server, roles, actor, role);
}

// `add-target` › VAI TRÒ: roles with no overwrite here yet, by rank; locked when level with
// or above the caller.
export function addTargets(
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[],
  channel: ChannelResponse,
  actor: PermissionMember,
) {
  const taken = new Set(
    channel.permission_overwrites
      .filter((o) => o.target_type === 'role')
      .map((o) => o.target_id),
  );
  return ranked(server.id, roles)
    .filter((r) => !taken.has(r.id))
    .map((role) => ({
      role,
      locked: !editable(server, roles, actor, role),
    }));
}

// S-SET-09 `private-roles`: every role but @everyone. An ADMINISTRATOR role always sees the
// channel (ticked, locked); the creator's highest role starts ticked unless they are the
// Owner or an Administrator; leaving every role of theirs out only warns.
export function privateViewers(
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[],
  actor: PermissionMember,
) {
  const s = toPermissionServer(server, roles);
  const sees = (r: RoleResponse) =>
    hasPermission(
      parsePermissionBitmap(r.permissions),
      Permission.ADMINISTRATOR,
    );
  const rows = ranked(server.id, roles)
    .filter((r) => r.id !== server.id)
    .map((role) => ({
      role,
      locked: sees(role),
      mine: false,
    }));
  const alwaysSees = computeBasePermissions(s, actor) === ALL_PERMISSIONS;
  const highest = alwaysSees
    ? undefined
    : rows.find((r) => actor.roleIds.includes(r.role.id));
  if (highest) highest.mine = true;
  return {
    rows,
    initial: highest ? [highest.role.id] : [],
    // `private-self-warning`
    wouldHide: (picked: readonly string[]) =>
      !alwaysSees && !actor.roleIds.some((id) => picked.includes(id)),
  };
}
