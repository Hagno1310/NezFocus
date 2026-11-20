import type {
  CreateRelationshipRequest,
  Relationship,
  UserLookupResponse,
} from '@nezfocus/shared';

// SRS 5.3 Friend. Errors are ApiError with the SRS 11.1 code.
export interface FriendRepository {
  list(): Promise<Relationship[]>;
  // idempotencyKey: the same press sent twice makes one request (REQ-MSG-09).
  send(
    body: CreateRelationshipRequest,
    idempotencyKey: string,
  ): Promise<Relationship>;
  accept(userId: string): Promise<Relationship>;
  block(userId: string): Promise<Relationship>;
  // Decline, cancel, unfriend or unblock, by the relationship as it is.
  remove(userId: string): Promise<void>;
  lookup(username: string): Promise<UserLookupResponse>;
}

// The cache behind FriendsState (SRS 8.7 `relationships`).
export interface LocalRelationships {
  all(): Promise<Relationship[]>;
  replace(list: readonly Relationship[]): Promise<void>;
}
