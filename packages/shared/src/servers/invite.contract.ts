import { z } from 'zod';
import { AvatarUrls } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Invite).
export const InviteRoutes = {
  // REQ-SRV-03 · 201 InviteResponse (an own live invite with the same settings comes back
  // instead, 200) · 40302 (CREATE_INVITE in the channel), 40401 (channel)
  create: '/channels/:id/invites',
  // REQ-SRV-04 · GET InvitePreview · DELETE 204 (creator or MANAGE_SERVER, else 40302)
  // · 40041 (expired, used up, revoked) · 40029 (> 30 unknown codes / minute / IP)
  byCode: '/invites/:code',
  // REQ-SRV-04 · ServerResponse (already a member: 200, uses unchanged) · 40041, 40306
  // (banned), 40011 (already in 100 servers), 40029
  accept: '/invites/:code/accept',
  // REQ-SRV-03 v1.7 · ServerInviteList (live ones, newest first) · 40302 (MANAGE_SERVER), 40401
  forServer: '/servers/:id/invites',
} as const;

// Outside /api/v1: the page a link opens when the app is not installed (REQ-SRV-07).
export const INVITE_LINK_HOST = 'nezfocus.app';
export const inviteUrl = (code: string, channelId?: string) =>
  `https://${INVITE_LINK_HOST}/invite/${code}` +
  (channelId ? `?channel=${channelId}` : '');

// REQ-SRV-03: 8–10 random letters and digits (8 base-62 characters ≈ 47.6 bits).
export const InviteCode = z.string().regex(/^[A-Za-z0-9]{8,10}$/);

const LINK =
  /^(?:https?:\/\/)?nezfocus\.app\/invite\/([A-Za-z0-9]{8,10})\/?(?:\?(?:.*&)?channel=(\d{1,20})\b.*)?$/;

// S-HOME-06 join-by-code: a bare code, or a pasted link from which the code is taken.
export function parseInviteInput(
  text: string,
): { code: string; channelId?: string } | null {
  const value = text.trim();
  if (InviteCode.safeParse(value).success) return { code: value };
  const link = LINK.exec(value);
  if (!link) return null;
  return link[2] ? { code: link[1]!, channelId: link[2] } : { code: link[1]! };
}

// REQ-SRV-03 settings. Seconds; 0 = never expires. Uses: 0 = unlimited (DDL `max_uses`).
export const INVITE_MAX_AGES = [1800, 3600, 86_400, 604_800, 0] as const;
export const INVITE_MAX_USES = [0, 1, 5, 10, 25, 50, 100] as const;
export const DEFAULT_INVITE_MAX_AGE = 604_800;
export const DEFAULT_INVITE_MAX_USES = 0;

export const CreateInviteRequest = z.object({
  max_age: z.literal(INVITE_MAX_AGES).default(DEFAULT_INVITE_MAX_AGE),
  max_uses: z.literal(INVITE_MAX_USES).default(DEFAULT_INVITE_MAX_USES),
});
export type CreateInviteRequest = z.input<typeof CreateInviteRequest>;

// An invite as its creator sees it (S-HOME-07).
export const InviteResponse = z.object({
  code: InviteCode,
  server_id: SnowflakeId,
  channel_id: SnowflakeId,
  max_age: z.number().int(), // 0 = never expires
  max_uses: z.number().int(), // 0 = unlimited
  uses: z.number().int(),
  expires_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
});
export type InviteResponse = z.infer<typeof InviteResponse>;

// REQ-SRV-04 preview (S-MOD-01). No server details for a broken invite (40041 instead).
export const InvitePreview = z.object({
  code: InviteCode,
  server: z.object({
    id: SnowflakeId,
    name: z.string(),
    icon_url: z.string().nullable(),
    member_count: z.number().int(),
    online_count: z.number().int(),
  }),
  // v1.9 CR-17: null when the creator left the server, is pending deletion or deleted.
  inviter: z
    .object({ display_name: z.string(), avatar: AvatarUrls.nullable() })
    .nullable(),
  // SRV-07 v1.6: set only when the invite targets a room (a voice channel), for `room-invite`.
  channel: z.object({ id: SnowflakeId, name: z.string() }).nullable(),
});
export type InvitePreview = z.infer<typeof InvitePreview>;

// REQ-SRV-03 v1.7 (S-SET-04 `invites`, P3-A3): "Tạo bởi Bình (binh.tran) · 3/10 lượt".
export const ServerInviteList = z.array(
  InviteResponse.extend({
    creator: z
      .object({
        id: SnowflakeId,
        display_name: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  }),
);
export type ServerInviteList = z.infer<typeof ServerInviteList>;

// SRS 5.4 SERVER_MEMBER_ADD, to the members (REQ-SRV-04 AC1). P2-A2 (#15) may add fields.
export const ServerMemberAdd = z.object({
  server_id: SnowflakeId,
  user: z.object({
    id: SnowflakeId,
    username: z.string().nullable(),
    display_name: z.string().nullable(),
    avatar: AvatarUrls.nullable(),
  }),
  role_ids: z.array(SnowflakeId), // without @everyone
  joined_at: z.iso.datetime(),
});
export type ServerMemberAdd = z.infer<typeof ServerMemberAdd>;
