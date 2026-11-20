import { ErrorCode, type CreateRelationshipRequest } from '@nezfocus/shared';
import type { StoreApi } from 'zustand/vanilla';
import {
  removeRelationship,
  upsertRelationship,
  type FriendsState,
} from './friends';
import type { FriendRepository } from './FriendRepository';

// REQ-FRIEND-01..03: the answer lands in the list at once; the Gateway event that follows is a no-op.
export function createFriendActions(
  repo: FriendRepository,
  store: StoreApi<FriendsState>,
) {
  const put = (r: Parameters<typeof upsertRelationship>[1]) => {
    store.setState(upsertRelationship(store.getState(), r));
    return r;
  };
  return {
    send: async (body: CreateRelationshipRequest, key: string) =>
      put(await repo.send(body, key)),
    // 09 › Edge case: accepting a request cancelled meanwhile (40401) drops the row, then rethrows.
    async accept(userId: string) {
      try {
        return put(await repo.accept(userId));
      } catch (err) {
        if ((err as { code?: number }).code === ErrorCode.NotFound)
          store.setState(removeRelationship(store.getState(), userId));
        throw err;
      }
    },
    block: async (userId: string) => put(await repo.block(userId)),
    async remove(userId: string) {
      await repo.remove(userId);
      store.setState(removeRelationship(store.getState(), userId));
    },
    lookup: (username: string) => repo.lookup(username),
  };
}
