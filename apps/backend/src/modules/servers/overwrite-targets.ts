import {
  ErrorCode,
  canEditOverwrite,
  type OverwriteTarget,
  type PermissionOverwrite,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import type { People } from './channels.repository.js';

type Target = Pick<PermissionOverwrite, 'target_id' | 'target_type'>;

const toMember = (people: People, userId: bigint) => ({
  userId: userId.toString(),
  roleIds: (people.roleIdsOf.get(userId) ?? []).map(String),
});

// undefined: no such role in this server, or the user is not a member.
export function overwriteTarget(
  people: People,
  o: Target,
): OverwriteTarget | undefined {
  const id = BigInt(o.target_id);
  if (o.target_type === 'role') {
    const role = people.roles.find((r) => r.id === id);
    return role && { type: 'role', role: { ...role, id: o.target_id } };
  }
  if (!people.roleIdsOf.has(id)) return undefined;
  return { type: 'member', member: toMember(people, id) };
}

// 8.5.2: only targets below the caller's highest role → else 40301. A role deleted
// meanwhile, or a member who left, outranks nobody.
export function assertCanEditTarget(
  serverId: bigint,
  people: People,
  userId: bigint,
  o: Target,
) {
  const target = overwriteTarget(people, o) ?? {
    type: 'member' as const,
    member: { userId: o.target_id, roleIds: [] },
  };
  const server = {
    id: serverId.toString(),
    ownerId: people.ownerId.toString(),
    roles: people.roles.map((r) => ({ ...r, id: r.id.toString() })),
  };
  if (!canEditOverwrite(server, toMember(people, userId), target))
    throw new AppError(
      ErrorCode.InsufficientRoleHierarchy,
      'The target is level with or above your highest role',
    );
}
