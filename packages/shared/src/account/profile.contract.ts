import { z } from 'zod';
import { AvatarUrls } from '../auth/auth.contract.js';
import { LookupRelationship } from '../friends/relationship.contract.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Account, REQ-AUTH-06 v1.9).
export const ProfileRoutes = {
  // GET → UserProfile · 40401 (no such user). Someone who blocked the caller answers as usual.
  byUser: '/users/:id/profile',
} as const;

export const ProfileUser = z.object({
  id: SnowflakeId,
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar: AvatarUrls.nullable(),
  bio: z.string().nullable(),
});
export type ProfileUser = z.infer<typeof ProfileUser>;

// S-HOME-10. The role and "Thành viên từ" inside a server come from the member list.
export const UserProfile = z.object({
  user: ProfileUser,
  deleted: z.boolean(), // "Tài khoản đã bị xóa": no names, no servers, no buttons
  relationship: LookupRelationship,
  // Only servers both are members of, in the caller's rail order (oldest joined first).
  mutual_servers: z.array(
    z.object({
      id: SnowflakeId,
      name: z.string(),
      icon_url: z.string().nullable(),
    }),
  ),
  // REQ-DM-02 / FRIEND-03 in one flag: false → `cannot-message` (also for yourself).
  can_message: z.boolean(),
});
export type UserProfile = z.infer<typeof UserProfile>;
