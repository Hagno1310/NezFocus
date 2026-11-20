import { localRelationships } from '../data/friends';
import {
  emptyFriends,
  friendsStore,
  reduceRelationships,
  setRelationships,
} from '../domain/friends/friends';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { sessionStore } from '../domain/session/sessionStore';

// REQ-FRIEND-04 AC1: the list comes from the local cache first, then READY / RELATIONSHIP_* keep
// both the store and the cache current.
export function startFriendsLifecycle() {
  const loadCache = () => {
    if (sessionStore.getState().status !== 'signed-in') return;
    localRelationships
      .all()
      .then((list) => {
        if (!friendsStore.getState().loaded && list.length)
          friendsStore.setState(setRelationships(emptyFriends, list));
      })
      .catch(() => {});
  };
  loadCache();
  const stopEvents = onGatewayEvent((event) => {
    const before = friendsStore.getState();
    const after = reduceRelationships(before, event);
    if (after !== before) friendsStore.setState(after);
  });
  const stopStore = friendsStore.subscribe((s, prev) => {
    if (s.byUser !== prev.byUser && s.loaded)
      localRelationships.replace(Object.values(s.byUser)).catch(() => {});
  });
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status === prev.status) return;
    if (s.status === 'signed-in') loadCache();
    else friendsStore.setState(emptyFriends);
  });
  return () => {
    stopEvents();
    stopStore();
    stopSession();
  };
}
