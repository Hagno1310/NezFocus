import { z } from 'zod';
import { AvatarUrls, Username } from '../auth/auth.contract.js';
import { countMessageChars } from '../messages/message.contract.js';
import { SnowflakeId } from '../snowflake.js';

// Paths are relative to /api/v1 (SRS 5.3 Friend). Someone who blocked the caller is never
// revealed: lookup answers as usual, only sending fails with the generic 40303 (FRIEND-01 AC9).
export const RelationshipRoutes = {
  // GET → Relationship[] · POST (Idempotency-Key) CreateRelationshipRequest → 201 Relationship ·
  // 40001 (message > 150), 40303 (blocked either way), 40401, 40902 (already sent), 40908 (friends),
  // 40029 (FRIEND_REQUESTS_PER_DAY). B already invited A → the answer is the new friendship.
  list: '/users/@me/relationships',
  // PUT UpdateRelationshipRequest → Relationship · 40401 (no request to accept, e.g. cancelled).
  // DELETE → 204: declines, cancels, unfriends or unblocks, by the current relationship · 40401
  byUser: '/users/@me/relationships/:userId',
  // GET UserLookupQuery → UserLookupResponse · 40401, 40029 (LOOKUPS_PER_MINUTE, Retry-After)
  lookup: '/users/lookup',
} as const;

export const REQUEST_MESSAGE_MAX = 150; // REQ-FRIEND-01 v1.9
export const FRIEND_REQUESTS_PER_DAY = 50; // REQ-FRIEND-01; only requests that become pending
export const LOOKUPS_PER_MINUTE = 30; // REQ-FRIEND-01 AC7

// REQ-FRIEND-01 v1.9: trim, drop one leading "@", lowercase.
export const normalizeUsernameQuery = (raw: string) =>
  raw.trim().replace(/^@/, '').toLowerCase();

// Seen from the caller: incoming = they invited me, outgoing = I invited them, blocked = I blocked them.
export const RelationshipType = z.enum([
  'friend',
  'incoming',
  'outgoing',
  'blocked',
]);
export type RelationshipType = z.infer<typeof RelationshipType>;

// FRIEND-01 AC9: no value for "they blocked me".
export const LookupRelationship = z.enum(['none', ...RelationshipType.options]);
export type LookupRelationship = z.infer<typeof LookupRelationship>;

export const RelationshipUser = z.object({
  id: SnowflakeId,
  username: z.string(),
  display_name: z.string().nullable(),
  avatar: AvatarUrls.nullable(),
});
export type RelationshipUser = z.infer<typeof RelationshipUser>;

export const Relationship = z.object({
  user: RelationshipUser,
  type: RelationshipType,
  request_message: z.string().nullable(), // pending only (REQ-FRIEND-04)
  created_at: z.iso.datetime(), // when the request was sent, or the block made
});
export type Relationship = z.infer<typeof Relationship>;

export const RequestMessage = z
  .string()
  .trim()
  .refine((m) => countMessageChars(m) <= REQUEST_MESSAGE_MAX, {
    message: 'TOO_LONG',
  });

export const CreateRelationshipRequest = z
  .object({
    username: Username.optional(), // from "Thêm bạn"
    user_id: SnowflakeId.optional(), // one step from a profile / DM (no message there)
    message: RequestMessage.optional(),
  })
  .refine((b) => (b.username === undefined) !== (b.user_id === undefined), {
    message: 'username or user_id',
  })
  .transform(({ message, ...rest }) => (message ? { ...rest, message } : rest));
export type CreateRelationshipRequest = z.infer<
  typeof CreateRelationshipRequest
>;

export const UpdateRelationshipRequest = z.object({
  type: z.enum(['friend', 'blocked']), // friend = accept their request
});
export type UpdateRelationshipRequest = z.infer<
  typeof UpdateRelationshipRequest
>;

export const UserLookupQuery = z.object({
  username: z.string().max(64).transform(normalizeUsernameQuery),
});
export type UserLookupQuery = z.infer<typeof UserLookupQuery>;

export const UserLookupResponse = z.object({
  user: RelationshipUser.extend({ bio: z.string().nullable() }),
  relationship: LookupRelationship,
  // Sorted by name; the app writes "Cùng ở {A} và {N} server khác" (S-DM-05).
  mutual_servers: z.array(z.object({ id: SnowflakeId, name: z.string() })),
});
export type UserLookupResponse = z.infer<typeof UserLookupResponse>;

// SRS 5.4 RELATIONSHIP_REMOVE: the type it had for the receiver.
export const RelationshipRemove = z.object({
  user_id: SnowflakeId,
  type: RelationshipType,
});
export type RelationshipRemove = z.infer<typeof RelationshipRemove>;
