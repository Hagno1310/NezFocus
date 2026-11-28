import { z } from 'zod';
import { AvatarUrls } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';
import { ModerationReason } from './member.contract.js';

// Paths are relative to /api/v1 (SRS 5.3 Ban). Every route needs BAN_MEMBERS (40302).
export const BanRoutes = {
  // REQ-ROLE-07 · GET BanListQuery → BanListResponse, newest ban first (CR-17)
  list: '/servers/:id/bans',
  // REQ-ROLE-05 / 07 · PUT BanRequest → 204 (already banned: 204, nothing changes) · 40001,
  // 40301 (the Owner, role at or above own highest), 40401 (no such user) · DELETE → 204
  // (unban) · 40401 (not banned)
  one: '/servers/:id/bans/:userId',
} as const;

export const BAN_PAGE_MAX = 100;

// REQ-ROLE-05: "Xóa tin nhắn gần đây" — Không xóa · 1 ngày qua · 7 ngày qua (AC1).
export const BanRequest = z.object({
  reason: ModerationReason,
  delete_message_days: z
    .union([z.literal(0), z.literal(1), z.literal(7)])
    .default(0),
});
export type BanRequest = z.input<typeof BanRequest>;

const BanUser = z.object({
  id: SnowflakeId,
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar: AvatarUrls.nullable(),
});

// S-SET-04 `bans` / `ban-detail`: "Cấm ngày 15/10/2026 bởi An (an.nguyen)".
export const ServerBan = z.object({
  user: BanUser,
  reason: z.string().nullable(),
  banned_by: BanUser.omit({ avatar: true }).nullable(), // null: that account is gone
  created_at: z.iso.datetime(),
});
export type ServerBan = z.infer<typeof ServerBan>;

// `q`: name or username, no marks, no case. `after`: next_cursor of the previous page.
export const BanListQuery = z.object({
  q: z.string().max(100).optional(),
  after: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(BAN_PAGE_MAX).default(50),
});
export type BanListQuery = z.infer<typeof BanListQuery>;

export const BanListResponse = z.object({
  bans: z.array(ServerBan),
  next_cursor: z.string().nullable(),
});
export type BanListResponse = z.infer<typeof BanListResponse>;

// SRS 5.4 SERVER_BAN_ADD / SERVER_BAN_REMOVE, to the members with BAN_MEMBERS.
export const ServerBanEvent = ServerBan.extend({ server_id: SnowflakeId });
export type ServerBanEvent = z.infer<typeof ServerBanEvent>;

export const ServerBanRemove = z.object({
  server_id: SnowflakeId,
  user_id: SnowflakeId,
});
export type ServerBanRemove = z.infer<typeof ServerBanRemove>;
