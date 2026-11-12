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
} as const;

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
// SERVER_MEMBER_UPDATE (P2-A2 #15) keeps it current; the timeout joins with P3-A3 (#23).
export const ServerMe = z.object({ role_ids: z.array(SnowflakeId) });
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
