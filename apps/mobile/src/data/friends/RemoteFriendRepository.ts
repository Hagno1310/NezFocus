import {
  IDEMPOTENCY_KEY_HEADER,
  Relationship,
  RelationshipRoutes,
  UserLookupResponse,
} from '@nezfocus/shared';
import type { FriendRepository } from '../../domain/friends/FriendRepository';
import { api } from '../api';

const byUser = (id: string) => RelationshipRoutes.byUser.replace(':userId', id);

export const remoteFriendRepository: FriendRepository = {
  list: async () =>
    Relationship.array().parse(await api.request(RelationshipRoutes.list)),
  send: async (body, key) =>
    Relationship.parse(
      await api.request(RelationshipRoutes.list, {
        method: 'POST',
        body,
        headers: { [IDEMPOTENCY_KEY_HEADER]: key },
      }),
    ),
  accept: async (userId) =>
    Relationship.parse(
      await api.request(byUser(userId), {
        method: 'PUT',
        body: { type: 'friend' },
      }),
    ),
  block: async (userId) =>
    Relationship.parse(
      await api.request(byUser(userId), {
        method: 'PUT',
        body: { type: 'blocked' },
      }),
    ),
  async remove(userId) {
    await api.request(byUser(userId), { method: 'DELETE' });
  },
  lookup: async (username) =>
    UserLookupResponse.parse(
      await api.request(
        `${RelationshipRoutes.lookup}?${new URLSearchParams({ username })}`,
      ),
    ),
};
