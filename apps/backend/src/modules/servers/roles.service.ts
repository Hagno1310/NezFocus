import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  MAX_ROLES_PER_SERVER,
  Permission,
  canGrantPermissions,
  canManageRole,
  duplicateRoleMessage,
  findDuplicateRole,
  highestRole,
  keepHiddenPermissions,
  newRolePlace,
  parsePermissionBitmap,
  planRoleReorder,
  type CreateRoleRequest,
  type PermissionMember,
  type PermissionServer,
  type RoleListResponse,
  type RoleReorderError,
  type RoleResponse,
  type UpdateRolePositionsRequest,
  type UpdateRoleRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PermissionCache } from '../permissions/permission-cache.js';
import { PermissionService } from '../permissions/permission.service.js';
import { RolesRepository, type LockedRoles } from './roles.repository.js';
import { toRoleResponse } from './servers.dto.js';
import { ServersRepository } from './servers.repository.js';
import type { RoleRow } from './servers.schema.js';

const invalid = (field: string, code: string, message: string) =>
  new AppError(ErrorCode.ValidationError, message, {
    [field]: [{ code, message }],
  });
const notFound = (what: string) => new AppError(ErrorCode.NotFound, what);
const outranked = () =>
  new AppError(
    ErrorCode.InsufficientRoleHierarchy,
    'The role is level with or above your highest role',
  );

const REORDER_ERRORS: Record<
  Exclude<RoleReorderError, 'hierarchy'>,
  [string, string]
> = {
  everyone: ['EVERYONE', '@everyone always stays last'],
  unknown_role: ['UNKNOWN_ROLE', 'Unknown role in this server'],
};

const toPlace = (r: RoleRow) => ({ id: r.id.toString(), position: r.position });
const fromPlace = (p: { id: string; position: number }) => ({
  id: BigInt(p.id),
  position: p.position,
});

// The caller as SRS 8.5.2 sees them, from what the lock read.
function actorOf(serverId: bigint, userId: bigint, locked: LockedRoles) {
  const server: PermissionServer = {
    id: serverId.toString(),
    ownerId: locked.caller.ownerId.toString(),
    roles: locked.rows.map((r) => ({
      id: r.id.toString(),
      permissions: r.permissions,
      position: r.position,
    })),
  };
  const member: PermissionMember = {
    userId: userId.toString(),
    roleIds: locked.caller.roleIds.map(String),
  };
  return { server, member, highest: highestRole(server, member) };
}

// REQ-ROLE-01/02 under the 8.5.2 hierarchy: below one's highest role, only bits one holds.
@Injectable()
export class RolesService {
  constructor(
    private readonly repo: RolesRepository,
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly cache: PermissionCache,
    private readonly events: EventPublisher,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
  ) {}

  async list(userId: bigint, serverId: bigint): Promise<RoleListResponse> {
    await this.memberOf(serverId, userId);
    return (await this.repo.list(serverId)).map((r) => ({
      ...toRoleResponse(r),
      member_count: r.memberCount,
    }));
  }

  async create(
    userId: bigint,
    serverId: bigint,
    body: CreateRoleRequest,
  ): Promise<RoleResponse> {
    await this.managerOf(serverId, userId);
    const { role, shifted } = await this.repo.locked(
      serverId,
      userId,
      async (locked) => {
        if (locked.rows.length >= MAX_ROLES_PER_SERVER)
          throw invalid(
            '_',
            'MAX_ROLES',
            `A server has at most ${MAX_ROLES_PER_SERVER} roles`,
          );
        this.checkName(locked, body.name);
        const place = newRolePlace(
          serverId.toString(),
          locked.rows.map(toPlace),
          actorOf(serverId, userId, locked).highest,
        );
        const moves = place.shifted.map(fromPlace);
        await locked.move(moves);
        const role = await locked.create({
          id: this.ids.next(),
          serverId,
          name: body.name,
          position: place.position,
          createdAt: this.clock.now(),
        });
        return { role, shifted: await locked.byIds(moves.map((m) => m.id)) };
      },
    );
    await this.cache.invalidateServer(serverId);
    const response = toRoleResponse(role);
    await this.events.toServer(serverId, 'SERVER_ROLE_CREATE', {
      server_id: serverId.toString(),
      role: response,
    });
    await this.announce(serverId, shifted);
    return response;
  }

  async update(
    userId: bigint,
    serverId: bigint,
    roleId: bigint,
    body: UpdateRoleRequest,
  ): Promise<RoleResponse> {
    await this.managerOf(serverId, userId);
    const role = await this.repo.locked(serverId, userId, async (locked) => {
      const actor = actorOf(serverId, userId, locked);
      const role = this.manageable(actor, locked, roleId);
      const set: Parameters<LockedRoles['update']>[1] = {};
      if (body.name !== undefined) {
        if (role.id === serverId)
          throw invalid('name', 'EVERYONE', '@everyone keeps its name');
        this.checkName(locked, body.name, role.id);
        set.name = body.name;
      }
      if (body.is_mentionable !== undefined)
        set.isMentionable = body.is_mentionable;
      if (body.permissions !== undefined) {
        // ROLE-02 v1.7: the bits without a screen keep their value.
        const next = keepHiddenPermissions(
          role.permissions,
          parsePermissionBitmap(body.permissions),
        );
        // Only changed bits count: a bit the editor lacks may stay (S-SET-02 `permission-locked`).
        if (
          !canGrantPermissions(
            actor.server,
            actor.member,
            next ^ role.permissions,
          )
        )
          throw new AppError(
            ErrorCode.Forbidden,
            'You can only grant permissions you have',
          );
        set.permissions = next;
      }
      return locked.update(role.id, set);
    });
    await this.cache.invalidateServer(serverId);
    const response = toRoleResponse(role);
    await this.events.toServer(serverId, 'SERVER_ROLE_UPDATE', {
      server_id: serverId.toString(),
      role: response,
    });
    return response;
  }

  async remove(userId: bigint, serverId: bigint, roleId: bigint) {
    await this.managerOf(serverId, userId);
    await this.repo.locked(serverId, userId, async (locked) => {
      if (roleId === serverId)
        throw invalid('role_id', 'EVERYONE', '@everyone cannot be deleted');
      const actor = actorOf(serverId, userId, locked);
      await locked.remove(this.manageable(actor, locked, roleId));
    });
    // ponytail: channels whose overwrites lost the role send CHANNEL_UPDATE with P1-A3.4 (#67).
    await this.cache.invalidateServer(serverId);
    await this.events.toServer(serverId, 'SERVER_ROLE_DELETE', {
      server_id: serverId.toString(),
      role_id: roleId.toString(),
    });
  }

  async reorder(
    userId: bigint,
    serverId: bigint,
    body: UpdateRolePositionsRequest,
  ): Promise<void> {
    await this.managerOf(serverId, userId);
    const moved = await this.repo.locked(serverId, userId, async (locked) => {
      const plan = planRoleReorder(
        serverId.toString(),
        locked.rows.map(toPlace),
        body,
        actorOf(serverId, userId, locked).highest,
      );
      if (!plan.ok) {
        if (plan.error === 'hierarchy') throw outranked();
        const [code, message] = REORDER_ERRORS[plan.error];
        throw invalid('id', code, message);
      }
      const moves = plan.changed.map(fromPlace);
      await locked.move(moves);
      return locked.byIds(moves.map((m) => m.id));
    });
    await this.cache.invalidateServer(serverId);
    await this.announce(serverId, moved);
  }

  // 40401 for a server that does not exist and for one the caller is not in.
  private async memberOf(serverId: bigint, userId: bigint) {
    if (!(await this.servers.isMember(serverId, userId)))
      throw notFound('Unknown server');
  }

  private async managerOf(serverId: bigint, userId: bigint) {
    await this.memberOf(serverId, userId);
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_ROLES,
    );
  }

  private manageable(
    actor: ReturnType<typeof actorOf>,
    locked: LockedRoles,
    roleId: bigint,
  ): RoleRow {
    const role = locked.rows.find((r) => r.id === roleId);
    if (!role) throw notFound('Unknown role');
    const target = {
      id: role.id.toString(),
      permissions: role.permissions,
      position: role.position,
    };
    if (!canManageRole(actor.server, actor.member, target)) throw outranked();
    return role;
  }

  // REQ-ROLE-01 AC4: case-insensitive, accent-sensitive; RoleName already refused @here.
  private checkName(locked: LockedRoles, name: string, self?: bigint) {
    const clash = findDuplicateRole(
      locked.rows.map((r) => ({ id: r.id.toString(), name: r.name })),
      { id: self?.toString(), name },
    );
    if (clash)
      throw invalid('name', 'DUPLICATE_NAME', duplicateRoleMessage(clash));
  }

  private async announce(serverId: bigint, roles: RoleRow[]) {
    for (const role of roles)
      await this.events.toServer(serverId, 'SERVER_ROLE_UPDATE', {
        server_id: serverId.toString(),
        role: toRoleResponse(role),
      });
  }
}
