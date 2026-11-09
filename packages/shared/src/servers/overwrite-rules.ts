import {
  canActOnMember,
  canManageRole,
} from '../permissions/compute-permissions.js';
import {
  Permission,
  parsePermissionBitmap,
  toPermissionBitmap,
  type PermissionMember,
  type PermissionRole,
  type PermissionServer,
} from '../permissions/permissions.js';
import type {
  OverwriteTargetType,
  PermissionOverwrite,
} from './channel.contract.js';

// REQ-ROLE-03 rules shared by the backend writes and the app's S-SET-06 / S-SET-09 screens.

// One bit of one target's overwrite set to allow or deny; the other side loses it.
function setBit(
  list: readonly PermissionOverwrite[],
  target_id: string,
  target_type: OverwriteTargetType,
  side: 'allow' | 'deny',
  bit: bigint,
): PermissionOverwrite[] {
  const at = list.findIndex(
    (o) => o.target_id === target_id && o.target_type === target_type,
  );
  const o = list[at] ?? { target_id, target_type, allow: '0', deny: '0' };
  let allow = parsePermissionBitmap(o.allow);
  let deny = parsePermissionBitmap(o.deny);
  if (side === 'allow') {
    allow |= bit;
    deny &= ~bit;
  } else {
    deny |= bit;
    allow &= ~bit;
  }
  const next = {
    ...o,
    allow: toPermissionBitmap(allow),
    deny: toPermissionBitmap(deny),
  };
  return at < 0 ? [...list, next] : list.map((x, i) => (i === at ? next : x));
}

// v1.9 CR-17: a private channel at creation starts from its category's overwrites, @everyone
// loses VIEW_CHANNEL and every chosen role gets it (any role, even above the creator).
export function privateChannelOverwrites(
  serverId: string,
  inherited: readonly PermissionOverwrite[],
  viewerRoleIds: readonly string[],
): PermissionOverwrite[] {
  let list = setBit(
    inherited,
    serverId,
    'role',
    'deny',
    Permission.VIEW_CHANNEL,
  );
  for (const id of viewerRoleIds)
    list = setBit(list, id, 'role', 'allow', Permission.VIEW_CHANNEL);
  return list;
}

export type OverwriteTarget =
  | { type: 'role'; role: PermissionRole }
  | { type: 'member'; member: PermissionMember };

// 8.5.2: only a role below one's highest, only a member whose highest role is below it.
export function canEditOverwrite(
  server: PermissionServer,
  actor: PermissionMember,
  target: OverwriteTarget,
) {
  return target.type === 'role'
    ? canManageRole(server, actor, target.role)
    : canActOnMember(server, actor, target.member);
}

// 8.5.2: the bits a write newly allows, which the actor must hold in the channel.
export const addedAllows = (
  before: Pick<PermissionOverwrite, 'allow'> | undefined,
  next: Pick<PermissionOverwrite, 'allow'>,
) =>
  parsePermissionBitmap(next.allow) &
  ~parsePermissionBitmap(before?.allow ?? '0');
