import {
  searchKey,
  type DispatchEvent,
  type PresenceEvent,
  type Relationship,
  type RelationshipType,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import { lastActive } from '../account/sessions';
import { localTime } from '../study/stats';

export type FriendsState = {
  byUser: Record<string, Relationship>; // one relationship per user (8.4.2)
  loaded: boolean; // READY or the local cache has filled it
  sendBlockedUntil: number; // 40029 on send: "Gửi lời mời" off until then (S-DM-05)
};

export const emptyFriends: FriendsState = {
  byUser: {},
  loaded: false,
  sendBlockedUntil: 0,
};

export const friendsStore = createStore<FriendsState>(() => emptyFriends);

export function setRelationships(
  state: FriendsState,
  list: readonly Relationship[],
): FriendsState {
  return {
    ...state,
    byUser: Object.fromEntries(list.map((r) => [r.user.id, r])),
    loaded: true,
  };
}

export function upsertRelationship(
  state: FriendsState,
  r: Relationship,
): FriendsState {
  return { ...state, byUser: { ...state.byUser, [r.user.id]: r } };
}

// Drops the user only while they still have `type`: a late REMOVE never undoes a newer ADD.
export function removeRelationship(
  state: FriendsState,
  userId: string,
  type?: RelationshipType,
): FriendsState {
  const current = state.byUser[userId];
  if (!current || (type && current.type !== type)) return state;
  const { [userId]: _, ...byUser } = state.byUser;
  return { ...state, byUser };
}

export function reduceRelationships(
  state: FriendsState,
  event: DispatchEvent,
): FriendsState {
  if (event.t === 'READY')
    return setRelationships(state, event.d.relationships);
  if (event.t === 'RELATIONSHIP_ADD') return upsertRelationship(state, event.d);
  if (event.t === 'RELATIONSHIP_REMOVE')
    return removeRelationship(state, event.d.user_id, event.d.type);
  return state;
}

export const nameOf = (u: Relationship['user']) => u.display_name ?? u.username;

const byName = (a: Relationship, b: Relationship) =>
  nameOf(a.user).localeCompare(nameOf(b.user), 'vi');
const newestFirst = (a: Relationship, b: Relationship) =>
  b.created_at.localeCompare(a.created_at);

// S-DM-04 `search`: name or username, no marks, no case.
const matches = (r: Relationship, query: string) => {
  const q = searchKey(query.trim());
  return (
    !q ||
    searchKey(nameOf(r.user)).includes(q) ||
    searchKey(r.user.username).includes(q)
  );
};

const ofType = (s: FriendsState, type: RelationshipType, query: string) =>
  Object.values(s.byUser).filter((r) => r.type === type && matches(r, query));

const STATUS_RANK: Record<PresenceEvent['status'], number> = {
  online: 0,
  idle: 1,
  dnd: 2,
  offline: 3,
};

export type FriendTab = 'online' | 'all';

// FRIEND-04: online (online → idle → dnd, then name) first; `all` adds the offline ones by name.
export function friendSections(
  s: FriendsState,
  presenceOf: (userId: string) => PresenceEvent,
  tab: FriendTab,
  query: string,
) {
  const rank = (r: Relationship) => STATUS_RANK[presenceOf(r.user.id).status];
  const friends = ofType(s, 'friend', query);
  const online = friends
    .filter((r) => rank(r) < STATUS_RANK.offline)
    .sort((a, b) => rank(a) - rank(b) || byName(a, b));
  const offline =
    tab === 'all'
      ? friends.filter((r) => rank(r) === STATUS_RANK.offline).sort(byName)
      : [];
  return { online, offline };
}

export const pendingRows = (
  s: FriendsState,
  chip: 'incoming' | 'outgoing',
  query: string,
) => ofType(s, chip, query).sort(newestFirst);

export const blockedRows = (s: FriendsState, query: string) =>
  ofType(s, 'blocked', query).sort(byName);

export const countOf = (s: FriendsState, type: RelationshipType) =>
  Object.values(s.byUser).filter((r) => r.type === type).length;

export const incomingCount = (s: FriendsState) => countOf(s, 'incoming');

// Spec 09 › Thời gian: today "19:48", "Hôm qua", "02/09", another year "02/09/2025".
export function requestTime(
  iso: string,
  now: number,
  timeZone: string,
): { kind: 'time'; text: string } | { kind: 'yesterday' } {
  const at = lastActive(iso, now, timeZone);
  if (at.kind === 'today') return { kind: 'time', text: at.time };
  if (at.kind === 'yesterday') return { kind: 'yesterday' };
  const year = localTime(new Date(now).toISOString(), timeZone).date.slice(
    0,
    4,
  );
  const sameYear = at.date.slice(6) === year;
  return { kind: 'time', text: sameYear ? at.date.slice(0, 5) : at.date };
}

// S-STUDY-02 "Bạn bè đang học" (04 › Ai được đếm): friends in a Room Session (seen or not) and
// friends studying alone; a voice room without a session does not count. Rooms with the most
// friends first, then "Đang học cùng nhóm", then Solo; by name inside each.
export function studyingFriends(
  s: FriendsState,
  presenceOf: (userId: string) => PresenceEvent,
) {
  const rows = ofType(s, 'friend', '').flatMap((r) => {
    const activity = presenceOf(r.user.id).activity;
    return activity && activity.kind !== 'voice' ? [{ r, activity }] : [];
  });
  const roomOf = (a: (typeof rows)[number]['activity']) =>
    a.kind === 'group_study' ? (a.room?.channel_id ?? null) : null;
  const inRoom = new Map<string, number>();
  for (const { activity } of rows) {
    const id = roomOf(activity);
    if (id) inRoom.set(id, (inRoom.get(id) ?? 0) + 1);
  }
  const rank = (a: (typeof rows)[number]['activity']) =>
    a.kind === 'solo' ? 2 : roomOf(a) ? 0 : 1;
  return rows.sort(
    (x, y) =>
      rank(x.activity) - rank(y.activity) ||
      (inRoom.get(roomOf(y.activity) ?? '') ?? 0) -
        (inRoom.get(roomOf(x.activity) ?? '') ?? 0) ||
      (roomOf(x.activity) ?? '').localeCompare(roomOf(y.activity) ?? '') ||
      byName(x.r, y.r),
  );
}
