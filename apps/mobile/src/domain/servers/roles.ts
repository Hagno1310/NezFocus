import {
  ErrorCode,
  MAX_ROLES_PER_SERVER,
  Permission,
  ROLE_PERMISSION_GROUPS,
  RoleName,
  canGrantPermissions,
  canManageRole,
  computeBasePermissions,
  findDuplicateRole,
  hasPermission,
  highestRole,
  parsePermissionBitmap,
  planRoleReorder,
  toPermissionBitmap,
  type PermissionMember,
  type PermissionName,
  type PermissionServer,
  type RoleResponse,
  type RolePermissionGroupId,
  type ServerSummary,
  type UpdateRolePositionsRequest,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import { toPermissionServer } from './serverAccess';

// S-SET-02 rules over the shared 8.5.2 calculator: what the caller sees locked, where a
// dragged role may land, which switches they may flip. The backend checks the same.

export type RoleActor = {
  server: PermissionServer;
  member: PermissionMember;
  perms: bigint; // server-wide
  highest: number | null; // null: the Owner
};

export function roleActor(
  server: Pick<ServerSummary, 'id' | 'owner_id'>,
  roles: readonly RoleResponse[],
  userId: string,
  roleIds: readonly string[],
): RoleActor {
  const s = toPermissionServer(server, roles);
  const member = { userId, roleIds: [...roleIds] };
  return {
    server: s,
    member,
    perms: computeBasePermissions(s, member),
    highest: highestRole(s, member),
  };
}

const manageable = (actor: RoleActor, role: RoleResponse) =>
  canManageRole(actor.server, actor.member, {
    id: role.id,
    permissions: parsePermissionBitmap(role.permissions),
    position: role.position,
  });

const byRank = (a: RoleResponse, b: RoleResponse) =>
  b.position - a.position || a.id.localeCompare(b.id);

// Highest first, @everyone (the role with the server's id) last.
const ranked = (serverId: string, roles: readonly RoleResponse[]) => [
  ...roles.filter((r) => r.id !== serverId).sort(byRank),
  ...roles.filter((r) => r.id === serverId),
];

export type RoleListRow = {
  role: RoleResponse;
  everyone: boolean;
  locked: boolean; // level with or above the caller (`hierarchy-blocked`: "Ngang bạn")
};

export function roleList(
  serverId: string,
  roles: readonly RoleResponse[],
  actor: RoleActor,
) {
  const rows: RoleListRow[] = ranked(serverId, roles).map((role) => ({
    role,
    everyone: role.id === serverId,
    locked: !manageable(actor, role),
  }));
  // The caller's highest role, named by the line on top when it blocks some row.
  const top =
    actor.highest === null
      ? undefined
      : rows.find(
          (r) =>
            !r.everyone &&
            r.role.position === actor.highest &&
            actor.member.roleIds.includes(r.role.id),
        )?.role;
  return {
    rows,
    blockedBy: top && rows.some((r) => r.locked) ? top : null,
    atLimit: roles.length >= MAX_ROLES_PER_SERVER,
    empty: rows.length === 1,
  };
}

// `reorder`: the role dropped at `toIndex` among the roles above @everyone (highest first).
// The whole list goes out numbered n…1; a drop that would lift or move a role level with or
// above the caller's highest goes back without a call (CR-17 #10).
export function dropRole(
  serverId: string,
  roles: readonly RoleResponse[],
  roleId: string,
  toIndex: number,
  actor: RoleActor,
): { ok: true; body: UpdateRolePositionsRequest | null } | { ok: false } {
  const order = ranked(serverId, roles).filter((r) => r.id !== serverId);
  const from = order.findIndex((r) => r.id === roleId);
  if (from < 0) return { ok: false };
  if (from === toIndex) return { ok: true, body: null };
  const next = [...order];
  next.splice(toIndex, 0, ...next.splice(from, 1));
  const body = next.map((r, i) => ({ id: r.id, position: next.length - i }));
  const plan = planRoleReorder(
    serverId,
    roles.map(({ id, position }) => ({ id, position })),
    body,
    actor.highest,
  );
  return plan.ok ? { ok: true, body } : { ok: false };
}

export type PermissionRow = {
  name: PermissionName;
  on: boolean;
  locked: boolean; // `permission-locked`: the caller lacks the bit (ROLE-01 AC2)
};

export function roleEditor(
  serverId: string,
  role: RoleResponse,
  roles: readonly RoleResponse[],
  actor: RoleActor,
): {
  everyone: boolean;
  readonly: boolean; // `role-readonly`
  adminOn: boolean; // `admin-on`
  groups: { id: RolePermissionGroupId; rows: PermissionRow[] }[];
} {
  const bits = parsePermissionBitmap(role.permissions);
  return {
    everyone: role.id === serverId,
    readonly: !manageable(actor, role),
    adminOn: hasPermission(bits, Permission.ADMINISTRATOR),
    groups: ROLE_PERMISSION_GROUPS.map((g) => ({
      id: g.id,
      rows: g.permissions.map((name) => ({
        name,
        on: hasPermission(bits, Permission[name]),
        locked: !canGrantPermissions(
          actor.server,
          actor.member,
          Permission[name],
        ),
      })),
    })),
  };
}

// The bitmap after one switch; the backend keeps the hidden bits (keepHiddenPermissions).
export const withPermission = (
  role: RoleResponse,
  name: PermissionName,
  on: boolean,
) => {
  const bits = parsePermissionBitmap(role.permissions);
  const bit = Permission[name];
  return toPermissionBitmap(on ? bits | bit : bits & ~bit);
};

export type RoleNameError = 'empty' | 'reserved' | 'taken';

// REQ-ROLE-01 AC4, AC5 on press, before the API: `create-name-taken`, `edit-role-name-taken`.
export function checkRoleName(
  roles: readonly RoleResponse[],
  raw: string,
  selfId?: string,
):
  | { ok: true; name: string }
  | { ok: false; error: RoleNameError; taken?: string } {
  const parsed = RoleName.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: raw.trim() ? 'reserved' : 'empty' };
  const clash = findDuplicateRole(roles, { id: selfId, name: parsed.data });
  return clash
    ? { ok: false, error: 'taken', taken: clash.name }
    : { ok: true, name: parsed.data };
}

export type RoleError =
  | RoleNameError
  | 'hierarchy' // 40301: the data was old (Toast chung of the code)
  | 'forbidden' // 40302: MANAGE_ROLES lost, or a bit the caller lacks
  | 'gone' // 40401: the role (or the server) is gone
  | 'limit' // 40001 MAX_ROLES
  | 'failed';

export function roleErrorOf(err: unknown): RoleError {
  const api = asApiError(err);
  if (!api) return 'failed';
  if (api.code === ErrorCode.InsufficientRoleHierarchy) return 'hierarchy';
  if (api.code === ErrorCode.Forbidden) return 'forbidden';
  if (api.code === ErrorCode.NotFound) return 'gone';
  if (api.code === ErrorCode.ValidationError) {
    const code = Object.values(api.errors ?? {}).flat()[0]?.code;
    if (code === 'DUPLICATE_NAME') return 'taken';
    if (code === 'RESERVED_NAME') return 'reserved';
    if (code === 'MAX_ROLES') return 'limit';
  }
  return 'failed';
}
