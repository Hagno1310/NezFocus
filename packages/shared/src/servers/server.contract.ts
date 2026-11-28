import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';
import { ChannelResponse } from './channel.contract.js';
import { RoleResponse } from './role.contract.js';

// Paths are relative to /api/v1 (SRS 5.3 Server).
export const ServerRoutes = {
  // REQ-SRV-01 · 201 ServerResponse · 40001 (name), 40011 (already in 100 servers)
  create: '/servers',
  // GET: ServerResponse · 40401 (not a member) · PATCH: ServerSummary · 40001 (name; system channel
  // not a text channel of this server), 40302 (MANAGE_SERVER), 40401
  byId: '/servers/:id',
  // REQ-SRV-05 (DELETE on byId): Owner only (else 40302) → 204, soft-deleted for 30 days.
  // POST TransferOwnerRequest → 204 · 40102, 40029 (shared wrong-password limit), 40302 (not
  // the Owner), 40303 (pending deletion / suspended), 40401 (not in the server), 40001 (oneself)
  transfer: '/servers/:id/transfer',
  // POST → ServerResponse · Owner only, within 30 days (else 40401)
  restore: '/servers/:id/restore',
  // DELETE → 204 (leave) · 40012 (the Owner) · 40401 (not a member)
  leave: '/users/@me/servers/:id',
  // GET → DeletedServersResponse (CR-28 #41): mine, deleted in the last 30 days
  deleted: '/users/@me/servers/deleted',
} as const;

// REQ-SRV-05 / SRS 8.6: a deleted server can be restored for 30 days, then it is purged.
export const SERVER_RESTORE_DAYS = 30;

// REQ-SRV-01: 2–100 characters; REQ-SRV-04: at most 100 servers per user.
export const SERVER_NAME_MIN = 2;
export const SERVER_NAME_MAX = 100;
export const MAX_SERVERS_PER_USER = 100;

export const ServerName = z
  .string()
  .trim()
  .min(SERVER_NAME_MIN)
  .max(SERVER_NAME_MAX);

// REQ-STUDY-05; a Study Server is an ordinary server once created (GLOSSARY).
export const ServerTemplate = z.enum(['general', 'study_server']);
export type ServerTemplate = z.infer<typeof ServerTemplate>;

// What READY lists and SERVER_UPDATE carries: enough for the drawer's server rail and header.
export const ServerSummary = z.object({
  id: SnowflakeId,
  name: z.string(),
  icon_url: z.string().nullable(),
  owner_id: SnowflakeId,
  template: ServerTemplate,
  system_channel_id: SnowflakeId.nullable(), // kênh tin chào mừng; null = "Không gửi"
  member_count: z.number().int(),
  created_at: z.iso.datetime(),
});
export type ServerSummary = z.infer<typeof ServerSummary>;

// The caller's own membership; with `roles` and each channel's overwrites it is what the
// app's calculator needs (REQ-ROLE-08). Role ids leave out @everyone, like PermissionMember.
// SERVER_MEMBER_UPDATE keeps it current. `timeout_until`: S-HOME-01 / voice preview `timed-out`.
export const ServerMe = z.object({
  role_ids: z.array(SnowflakeId),
  timeout_until: z.iso.datetime().nullable(),
});
export type ServerMe = z.infer<typeof ServerMe>;

// "Server đầy đủ": the categories and channels the caller may view, the roles, and the
// caller's own roles.
export const ServerResponse = ServerSummary.extend({
  channels: z.array(ChannelResponse),
  roles: z.array(RoleResponse),
  me: ServerMe,
});
export type ServerResponse = z.infer<typeof ServerResponse>;

// icon_attachment_id: a completed `server_icon` upload of the caller (else 40001).
export const CreateServerRequest = z.object({
  name: ServerName,
  template: ServerTemplate,
  icon_attachment_id: SnowflakeId.optional(),
});
export type CreateServerRequest = z.infer<typeof CreateServerRequest>;

export const UpdateServerRequest = z
  .object({
    name: ServerName.optional(),
    system_channel_id: SnowflakeId.nullable().optional(),
    icon_attachment_id: SnowflakeId.nullable().optional(), // null = back to the initials
  })
  .refine((body) => Object.keys(body).length > 0, 'nothing to update');
export type UpdateServerRequest = z.infer<typeof UpdateServerRequest>;

// REQ-SRV-05: the password again (S-MOD-03 `password`).
export const TransferOwnerRequest = z.object({
  user_id: SnowflakeId,
  password: z.string().min(1).max(128),
});
export type TransferOwnerRequest = z.infer<typeof TransferOwnerRequest>;

// 02 S-HOME-06 `restore-list`: "Còn 30 ngày để khôi phục".
export const DeletedServer = z.object({
  id: SnowflakeId,
  name: z.string(),
  icon_url: z.string().nullable(),
  deleted_at: z.iso.datetime(),
  restore_until: z.iso.datetime(),
});
export type DeletedServer = z.infer<typeof DeletedServer>;

export const DeletedServersResponse = z.object({
  servers: z.array(DeletedServer),
});
export type DeletedServersResponse = z.infer<typeof DeletedServersResponse>;

// SRS 5.4 SERVER_DELETE (SRV-05 AC4), to the members: the server leaves the rail.
export const ServerDeleted = z.object({ id: SnowflakeId });
export type ServerDeleted = z.infer<typeof ServerDeleted>;
