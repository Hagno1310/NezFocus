import { z } from 'zod';
import { AvatarUrls } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Member).
export const MemberRoutes = {
  // REQ-ROLE-04 · GET MemberListQuery → MemberListResponse · 40401 (not a member; channel not in
  // the server or not viewable)
  list: '/servers/:id/members',
  // REQ-ROLE-04, CR-28 #23 · PUT / DELETE 204 · 40001 (@everyone), 40301 (role or member at or
  // above own highest; the Owner), 40302 (MANAGE_ROLES), 40401 (member, role)
  role: '/servers/:id/members/:userId/roles/:roleId',
  // REQ-VC-04, CR-28 #2 · PATCH MemberVoiceRequest (voice.contract.ts)
  voice: '/servers/:id/members/:userId/voice',
} as const;

export const MEMBER_PAGE_MAX = 1000;

export const ServerMember = z.object({
  user: z.object({
    id: SnowflakeId,
    username: z.string().nullable(),
    display_name: z.string().nullable(),
    avatar: AvatarUrls.nullable(),
  }),
  role_ids: z.array(SnowflakeId), // without @everyone
  joined_at: z.iso.datetime(),
  timeout_until: z.iso.datetime().nullable(), // REQ-ROLE-05; set by P3-A3 (#23)
});
export type ServerMember = z.infer<typeof ServerMember>;

// `channel_id`: only who can VIEW_CHANNEL it (S-HOME-03, mention suggestions).
// `q`: name or username, no marks, no case. `after`: next_cursor of the previous page.
export const MemberListQuery = z.object({
  q: z.string().max(100).optional(),
  channel_id: SnowflakeId.optional(),
  after: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(MEMBER_PAGE_MAX).default(100),
});
export type MemberListQuery = z.infer<typeof MemberListQuery>;

// By name (Vietnamese alphabet), tie → username (compareMembers).
export const MemberListResponse = z.object({
  members: z.array(ServerMember),
  next_cursor: z.string().nullable(),
});
export type MemberListResponse = z.infer<typeof MemberListResponse>;

// SRS 5.4 SERVER_MEMBER_ADD (REQ-SRV-04 AC1) and SERVER_MEMBER_UPDATE (REQ-ROLE-04 AC2), to the
// members.
export const ServerMemberEvent = ServerMember.extend({
  server_id: SnowflakeId,
});
export type ServerMemberEvent = z.infer<typeof ServerMemberEvent>;

// SRS 5.4 SERVER_MEMBER_REMOVE: leave, kick, ban. Sent by P3-A4.1 (#130) and P3-A3.1 (#126).
export const ServerMemberRemove = z.object({
  server_id: SnowflakeId,
  user_id: SnowflakeId,
});
export type ServerMemberRemove = z.infer<typeof ServerMemberRemove>;
