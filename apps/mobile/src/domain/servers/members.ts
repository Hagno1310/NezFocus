import {
  canActOnMember,
  canManageRole,
  compareMembers,
  parsePermissionBitmap,
  type DispatchEvent,
  type RoleResponse,
  type ServerMember,
  type ServerSummary,
} from '@nezfocus/shared';
import { localTime } from '../study/stats';
import { ranked, type RoleActor } from './roles';

type Server = Pick<ServerSummary, 'id' | 'owner_id'>;

// C-28 right side; S-SET-03 shows a running timeout there instead (v1.9 "Tạm khóa").
export type RightLabel =
  | { kind: 'owner' }
  | { kind: 'role'; name: string }
  | { kind: 'timeout'; until: string }
  | null;

export function memberRightLabel(
  server: Server,
  roles: readonly RoleResponse[],
  m: ServerMember,
  now: number | null, // null: no timeout label (C-28 in the drawer shows the role)
): RightLabel {
  if (m.user.id === server.owner_id) return { kind: 'owner' };
  if (now !== null && m.timeout_until && Date.parse(m.timeout_until) > now)
    return { kind: 'timeout', until: m.timeout_until };
  const top = ranked(server.id, roles).find((r) => m.role_ids.includes(r.id));
  return top && top.id !== server.id ? { kind: 'role', name: top.name } : null;
}

// ROLE-04 AC1 `member-blocked`. Oneself is never blocked: only the role counts (CR-28 #24).
export function memberBlock(
  server: Server,
  actor: RoleActor,
  target: ServerMember,
): 'owner' | 'outranked' | null {
  if (target.user.id === actor.member.userId) return null;
  if (target.user.id === server.owner_id) return 'owner';
  const asMember = { userId: target.user.id, roleIds: target.role_ids };
  return canActOnMember(actor.server, actor.member, asMember)
    ? null
    : 'outranked';
}

export type MemberRoleRow = {
  role: RoleResponse;
  checked: boolean;
  locked: boolean; // `disabled`: the member or the role is level with / above the viewer
};

// `member-detail` VAI TRÒ: by position, highest first, without @everyone.
export function memberRoleRows(
  server: Server,
  roles: readonly RoleResponse[],
  actor: RoleActor,
  target: ServerMember,
): MemberRoleRow[] {
  const blocked = memberBlock(server, actor, target) !== null;
  return ranked(server.id, roles)
    .filter((r) => r.id !== server.id)
    .map((role) => ({
      role,
      checked: target.role_ids.includes(role.id),
      locked:
        blocked ||
        !canManageRole(actor.server, actor.member, {
          id: role.id,
          permissions: parsePermissionBitmap(role.permissions),
          position: role.position,
        }),
    }));
}

// S-HOME-03 `members`: TRỰC TUYẾN (Idle and DND included) / NGOẠI TUYẾN, each by name.
export function drawerGroups(
  members: readonly ServerMember[],
  presenceOf: (userId: string) => string, // PresenceEvent status; absent = 'offline'
) {
  const sorted = [...members].sort(compareMembers);
  return {
    online: sorted.filter((m) => presenceOf(m.user.id) !== 'offline'),
    offline: sorted.filter((m) => presenceOf(m.user.id) === 'offline'),
  };
}

// SERVER_MEMBER_* on a list on screen: in place, never re-sorted (S-SET-03, S-HOME-03).
export function applyMemberEvent(
  list: readonly ServerMember[],
  serverId: string,
  e: DispatchEvent,
): readonly ServerMember[] {
  if (
    (e.t !== 'SERVER_MEMBER_ADD' &&
      e.t !== 'SERVER_MEMBER_UPDATE' &&
      e.t !== 'SERVER_MEMBER_REMOVE') ||
    e.d.server_id !== serverId
  )
    return list;
  if (e.t === 'SERVER_MEMBER_REMOVE')
    return list.filter((m) => m.user.id !== e.d.user_id);
  const { server_id: _, ...member } = e.d;
  return list.some((m) => m.user.id === member.user.id)
    ? list.map((m) => (m.user.id === member.user.id ? member : m))
    : [...list, member];
}

// "Tạm khóa tới 21:12", another day "21:12, 19/10" (spec 08 S-SET-03, CR-17).
export function untilText(until: string, now: number, timeZone: string) {
  const at = localTime(until, timeZone);
  const today = localTime(new Date(now).toISOString(), timeZone).date;
  if (at.date === today) return at.time;
  const [, m, d] = at.date.split('-');
  return `${at.time}, ${d}/${m}`;
}

// "Thành viên từ 05/10/2026".
export function sinceText(joinedAt: string, timeZone: string) {
  const [y, m, d] = localTime(joinedAt, timeZone).date.split('-');
  return `${d}/${m}/${y}`;
}
