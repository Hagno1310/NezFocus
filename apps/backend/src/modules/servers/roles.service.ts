import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  MAX_ROLES_PER_SERVER,
  Permission,
  canGrantPermissions,
  canManageRole,
  duplicateRoleMessage,
  findDuplicateRole,
  keepHiddenPermissions,
  newRolePlace,
  parsePermissionBitmap,
  planRoleReorder,
  type CreateRoleRequest,
  type PermissionMember,
  type PermissionServer,
  type RoleListResponse,
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
import {
  PermissionsRepository,
  type ServerFacts,
} from '../permissions/permissions.repository.js';
import { RolesRepository, type LockedRoles } from './roles.repository.js';
import { toRoleResponse } from './servers.dto.js';
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

// The caller as SRS 8.5.2 sees them, against the roles read under the lock.
type Actor = { server: PermissionServer; member: PermissionMember };

// REQ-ROLE-01/02: create, rename, re-permission, delete and reorder roles under the
// hierarchy (8.5.2): below one's highest role, only bits one holds; only the Owner is exempt.
@Injectable()
export class RolesService {
  constructor(
    private readonly repo: RolesRepository,
    private readonly facts: PermissionsRepository,
    private readonly permissions: PermissionService,
    private readonly cache: PermissionCache,
    private readonly events: EventPublisher,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
  ) {}

  async list(userId: bigint, serverId: bigint): Promise<RoleListResponse> {
    await this.memberFacts(serverId, userId);
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
    const facts = await this.managerFacts(serverId, userId);
    const { role, shifted } = await this.repo.locked(
      serverId,
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
          this.highest(this.actor(serverId, facts, locked.rows)),
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
    const facts = await this.managerFacts(serverId, userId);
    const { role, permissionsChanged } = await this.repo.locked(
      serverId,
      async (locked) => {
        const role = this.manageable(serverId, facts, locked, roleId);
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
          // Only the bits that change count: a bit the editor lacks may stay as it is.
          const actor = this.actor(serverId, facts, locked.rows);
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
        return {
          role: await locked.update(role.id, set),
          permissionsChanged: set.permissions !== undefined,
        };
      },
    );
    if (permissionsChanged) await this.cache.invalidateServer(serverId);
    const response = toRoleResponse(role);
    await this.events.toServer(serverId, 'SERVER_ROLE_UPDATE', {
      server_id: serverId.toString(),
      role: response,
    });
    return response;
  }

  async remove(userId: bigint, serverId: bigint, roleId: bigint) {
    const facts = await this.managerFacts(serverId, userId);
    await this.repo.locked(serverId, async (locked) => {
      if (roleId === serverId)
        throw invalid('role_id', 'EVERYONE', '@everyone cannot be deleted');
      await locked.remove(this.manageable(serverId, facts, locked, roleId));
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
    const facts = await this.managerFacts(serverId, userId);
    const moved = await this.repo.locked(serverId, async (locked) => {
      const plan = planRoleReorder(
        serverId.toString(),
        locked.rows.map(toPlace),
        body,
        this.highest(this.actor(serverId, facts, locked.rows)),
      );
      if (!plan.ok) {
        if (plan.error === 'hierarchy') throw outranked();
        throw invalid(
          'id',
          plan.error === 'everyone' ? 'EVERYONE' : 'UNKNOWN_ROLE',
          plan.error === 'everyone'
            ? '@everyone always stays last'
            : 'Unknown role in this server',
        );
      }
      const moves = plan.changed.map(fromPlace);
      await locked.move(moves);
      return locked.byIds(moves.map((m) => m.id));
    });
    await this.announce(serverId, moved);
  }

  // 40401 for a server that does not exist and for one the caller is not in.
  private async memberFacts(serverId: bigint, userId: bigint) {
    const facts = await this.facts.server(serverId, userId);
    if (!facts?.member) throw notFound('Unknown server');
    return facts;
  }

  private async managerFacts(serverId: bigint, userId: bigint) {
    const facts = await this.memberFacts(serverId, userId);
    await this.permissions.require(
      userId,
      { serverId },
      Permission.MANAGE_ROLES,
    );
    return { ...facts, userId };
  }

  private actor(
    serverId: bigint,
    facts: ServerFacts & { userId: bigint },
    rows: RoleRow[],
  ): Actor {
    return {
      server: {
        id: serverId.toString(),
        ownerId: facts.ownerId.toString(),
        roles: rows.map((r) => ({
          id: r.id.toString(),
          permissions: r.permissions,
          position: r.position,
        })),
      },
      member: {
        userId: facts.userId.toString(),
        roleIds: facts.member!.roleIds.map(String),
      },
    };
  }

  // null for the Owner (above every role); 0 for someone with no role.
  private highest({ server, member }: Actor): number | null {
    if (server.ownerId === member.userId) return null;
    return Math.max(
      0,
      ...server.roles
        .filter((r) => r.id !== server.id && member.roleIds.includes(r.id))
        .map((r) => r.position),
    );
  }

  private manageable(
    serverId: bigint,
    facts: ServerFacts & { userId: bigint },
    locked: LockedRoles,
    roleId: bigint,
  ): RoleRow {
    const role = locked.rows.find((r) => r.id === roleId);
    if (!role) throw notFound('Unknown role');
    const { server, member } = this.actor(serverId, facts, locked.rows);
    if (
      !canManageRole(server, member, {
        id: role.id.toString(),
        permissions: role.permissions,
        position: role.position,
      })
    )
      throw outranked();
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

const toPlace = (r: RoleRow) => ({ id: r.id.toString(), position: r.position });
const fromPlace = (p: { id: string; position: number }) => ({
  id: BigInt(p.id),
  position: p.position,
});
