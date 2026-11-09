import { z } from 'zod';
import {
  PermissionBitmap,
  parsePermissionBitmap,
  type PermissionRole,
} from '../permissions/permissions.js';
import { SnowflakeId } from '../snowflake.js';
import { RoleName } from './role-names.js';

// Paths are relative to /api/v1 (SRS 5.3 Role). Hierarchy (8.5.2): a caller who is not the
// Owner only touches roles below their highest role and only grants bits they have;
// ADMINISTRATOR does not skip it.
export const RoleRoutes = {
  // GET: RoleListResponse · 40401 (not a member)
  // POST REQ-ROLE-01: 201 RoleResponse · 40001 (field name; code MAX_ROLES), 40302 (MANAGE_ROLES), 40401
  list: '/servers/:id/roles',
  // REQ-ROLE-01 · 204 · 40001 (@everyone, a role of another server), 40301 (to or above the
  // caller's highest role), 40302, 40401. Register before byId: "positions" is not a role id.
  positions: '/servers/:id/roles/positions',
  // PATCH: RoleResponse · 40001 (field name; renaming @everyone), 40301, 40302 (MANAGE_ROLES,
  // or granting a bit the caller lacks), 40401 · DELETE: 204 · 40001 (@everyone), 40301, 40302, 40401
  byId: '/servers/:id/roles/:roleId',
} as const;

// REQ-ROLE-01: at most 250 roles per server, @everyone included.
export const MAX_ROLES_PER_SERVER = 250;

// REQ-ROLE-01 (v1.7): name, permissions and is_mentionable; colour and hoist are v1.x and
// never sent.
export const RoleResponse = z.object({
  id: SnowflakeId, // @everyone has the server's id
  name: z.string(),
  permissions: PermissionBitmap,
  position: z.number().int(), // @everyone = 0, higher = more senior
  is_mentionable: z.boolean(),
});
export type RoleResponse = z.infer<typeof RoleResponse>;

// S-SET-02 `list` ("2 người"); the count is only fetched with the list, events carry the role.
export const RoleListResponse = z.array(
  RoleResponse.extend({ member_count: z.number().int() }),
);
export type RoleListResponse = z.infer<typeof RoleListResponse>;

// A new role has no permission and sits right below the creator's highest role (the Owner
// or someone with no role: at the top).
export const CreateRoleRequest = z.object({ name: RoleName });
export type CreateRoleRequest = z.infer<typeof CreateRoleRequest>;

// `permissions` is the whole bitmap; the backend keeps the hidden bits (keepHiddenPermissions).
export const UpdateRoleRequest = z
  .object({
    name: RoleName.optional(),
    permissions: PermissionBitmap.optional(),
    is_mentionable: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'nothing to update');
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequest>;

// @everyone stays at 0, so every listed role goes to 1 or above.
export const UpdateRolePositionsRequest = z
  .array(z.object({ id: SnowflakeId, position: z.number().int().min(1) }))
  .min(1);
export type UpdateRolePositionsRequest = z.infer<
  typeof UpdateRolePositionsRequest
>;

// SERVER_ROLE_CREATE / SERVER_ROLE_UPDATE (one per moved role on a reorder) to the members.
export const ServerRoleEvent = z.object({
  server_id: SnowflakeId,
  role: RoleResponse,
});
export type ServerRoleEvent = z.infer<typeof ServerRoleEvent>;

export const ServerRoleDeleted = z.object({
  server_id: SnowflakeId,
  role_id: SnowflakeId,
});
export type ServerRoleDeleted = z.infer<typeof ServerRoleDeleted>;

// The calculator's input (P0-6 #53) from what the API sends.
export const toPermissionRole = (r: RoleResponse): PermissionRole => ({
  id: r.id,
  permissions: parsePermissionBitmap(r.permissions),
  position: r.position,
});
