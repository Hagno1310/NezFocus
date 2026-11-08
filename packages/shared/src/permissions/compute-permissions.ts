// REQ-ROLE-08: SRS 8.5.2 step for step; backend decides, the app reuses it to hide controls.
import {
  ALL_PERMISSIONS,
  Permission as P,
  type PermissionChannel,
  type PermissionMember,
  type PermissionOverwriteInput,
  type PermissionRole,
  type PermissionServer,
} from './permissions.js';

const isOwner = (server: PermissionServer, member: PermissionMember) =>
  server.ownerId === member.userId;

// Skips @everyone even if a caller lists it, so its overwrite never joins step 2.
const memberRoles = (server: PermissionServer, member: PermissionMember) =>
  server.roles.filter(
    (r) => r.id !== server.id && member.roleIds.includes(r.id),
  );

const isTimedOut = (member: PermissionMember, now: Date) =>
  !!member.timeoutUntil && member.timeoutUntil.getTime() > now.getTime();

export function computeBasePermissions(
  server: PermissionServer,
  member: PermissionMember,
  now: Date = new Date(),
): bigint {
  if (isOwner(server, member)) return ALL_PERMISSIONS;
  let perms = server.roles.find((r) => r.id === server.id)?.permissions ?? 0n;
  for (const r of memberRoles(server, member)) perms |= r.permissions;
  if (perms & P.ADMINISTRATOR) return ALL_PERMISSIONS;
  if (isTimedOut(member, now)) perms &= P.VIEW_CHANNEL; // CR-28 #17
  return perms;
}

const applyOverwrite = (perms: bigint, o: { allow: bigint; deny: bigint }) =>
  (perms & ~o.deny) | o.allow;

export function computeChannelPermissions(
  server: PermissionServer,
  member: PermissionMember,
  channel: PermissionChannel,
  now: Date = new Date(),
): bigint {
  let perms = computeBasePermissions(server, member, now);
  if (perms === ALL_PERMISSIONS) return ALL_PERMISSIONS; // Owner / Administrator

  const overwrites: readonly PermissionOverwriteInput[] =
    channel.permissionsSynced && channel.parent
      ? channel.parent.overwrites
      : channel.overwrites;
  const find = (type: PermissionOverwriteInput['type'], targetId: string) =>
    overwrites.find((o) => o.type === type && o.targetId === targetId);

  // 1) @everyone
  const everyone = find('role', server.id);
  if (everyone) perms = applyOverwrite(perms, everyone);

  // 2) the member's roles, merged: all denies first, then all allows
  const merged = { allow: 0n, deny: 0n };
  for (const r of memberRoles(server, member)) {
    const o = find('role', r.id);
    if (o) {
      merged.deny |= o.deny;
      merged.allow |= o.allow;
    }
  }
  perms = applyOverwrite(perms, merged);

  // 3) the member
  const own = find('member', member.userId);
  if (own) perms = applyOverwrite(perms, own);

  // 4) implicit permissions
  if (!(perms & P.VIEW_CHANNEL)) return 0n;
  if (channel.type === 'text' && !(perms & P.SEND_MESSAGES)) {
    perms &= ~(P.ATTACH_FILES | P.EMBED_LINKS | P.MENTION_EVERYONE);
  }
  if (channel.type === 'voice' && !(perms & P.CONNECT)) {
    perms &= ~(
      P.SPEAK |
      P.VIDEO |
      P.MUTE_MEMBERS |
      P.DEAFEN_MEMBERS |
      P.MOVE_MEMBERS
    );
  }

  // 5) timeout again: overwrite allows in steps 1–3 may have added bits back
  if (isTimedOut(member, now)) perms &= P.VIEW_CHANNEL;
  return perms;
}

// Hierarchy (8.5.2; REQ-ROLE-01, 04, 05). ADMINISTRATOR does not bypass it; only the Owner does.

const highestRolePosition = (
  server: PermissionServer,
  member: PermissionMember,
) => Math.max(0, ...memberRoles(server, member).map((r) => r.position));

export function canManageRole(
  server: PermissionServer,
  actor: PermissionMember,
  role: PermissionRole,
) {
  if (isOwner(server, actor)) return true;
  return role.position < highestRolePosition(server, actor);
}

// REQ-ROLE-05: nobody acts on the Owner, not even an Administrator.
export function canActOnMember(
  server: PermissionServer,
  actor: PermissionMember,
  target: PermissionMember,
) {
  if (isOwner(server, target)) return false;
  if (isOwner(server, actor)) return true;
  return (
    highestRolePosition(server, target) < highestRolePosition(server, actor)
  );
}

// CR-28 #18: an ADMINISTRATOR keeps every permission while timed out, so they can't be.
export function canTimeOutMember(
  server: PermissionServer,
  actor: PermissionMember,
  target: PermissionMember,
) {
  return (
    canActOnMember(server, actor, target) &&
    computeBasePermissions(server, target) !== ALL_PERMISSIONS
  );
}

// REQ-ROLE-01: only bits the actor holds server-wide.
export function canGrantPermissions(
  server: PermissionServer,
  actor: PermissionMember,
  permissions: bigint,
) {
  return (permissions & ~computeBasePermissions(server, actor)) === 0n;
}
