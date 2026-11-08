import { z } from 'zod';
import { PermissionBitmap } from '../permissions/permissions.js';
import { SnowflakeId } from '../snowflake.js';
import { ChannelResponse } from './channel.contract.js';

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

// P1 carries what the server needs to exist; REQ-ROLE-01 (P1-A3.1 #64) adds the rest.
export const RoleResponse = z.object({
  id: SnowflakeId, // @everyone has the server's id
  name: z.string(),
  permissions: PermissionBitmap,
  position: z.number().int(), // @everyone = 0, higher = more senior
});
export type RoleResponse = z.infer<typeof RoleResponse>;

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

// "Server đầy đủ": the categories and channels the caller may view, and the roles.
export const ServerResponse = ServerSummary.extend({
  channels: z.array(ChannelResponse),
  roles: z.array(RoleResponse),
});
export type ServerResponse = z.infer<typeof ServerResponse>;

// ponytail: icon via POST /attachments `server_icon` is not needed in P1.
export const CreateServerRequest = z.object({
  name: ServerName,
  template: ServerTemplate,
});
export type CreateServerRequest = z.infer<typeof CreateServerRequest>;

export const UpdateServerRequest = z
  .object({
    name: ServerName.optional(),
    system_channel_id: SnowflakeId.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'nothing to update');
export type UpdateServerRequest = z.infer<typeof UpdateServerRequest>;
