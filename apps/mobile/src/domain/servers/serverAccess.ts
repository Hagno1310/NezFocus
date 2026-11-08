import {
  Permission as P,
  computeBasePermissions,
  hasPermission,
  parsePermissionBitmap,
  type RoleResponse,
  type ServerSummary,
} from '@nezfocus/shared';

// What the caller may do in a server, from the shared 8.5.2 calculator.
// ponytail: the caller's own roles arrive with P1-A3 (#8); until then only Owner and
// @everyone count.
export function myServerPermissions(
  server: ServerSummary,
  roles: readonly RoleResponse[] | undefined,
  userId: string | null,
): bigint {
  if (!userId) return 0n;
  return computeBasePermissions(
    {
      id: server.id,
      ownerId: server.owner_id,
      roles: (roles ?? []).map((r) => ({
        id: r.id,
        permissions: parsePermissionBitmap(r.permissions),
        position: r.position,
      })),
    },
    { userId, roleIds: [] },
  );
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
