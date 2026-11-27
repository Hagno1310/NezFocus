import type { FocusSessionState } from '@nezfocus/shared';

// One Study Room with a Room Session, as the Gateway told (CR-28 #38): who sits there, and
// whether I may VIEW_CHANNEL + CONNECT (SRS 3.1, Tab Học).
export type RoomCandidate = {
  session: FocusSessionState;
  people: readonly string[]; // user ids in the room (voice_states)
  canJoin: boolean;
};

export type ActiveRoom = {
  channelId: string;
  serverId: string;
  session: FocusSessionState;
  mine: boolean; // "Bạn ở đây"
  friends: string[]; // friends in the room
  people: number; // everyone else, me not counted
};

// Spec 04 › Sắp xếp: the room I am in → more friends → more people → started earlier.
export function activeRooms(
  candidates: readonly RoomCandidate[],
  meId: string,
  myChannel: string | null,
  friends: ReadonlySet<string>,
): ActiveRoom[] {
  return candidates
    .filter((c) => c.canJoin)
    .map((c) => ({
      channelId: c.session.channel_id,
      serverId: c.session.server_id,
      session: c.session,
      mine: c.session.channel_id === myChannel,
      friends: c.people.filter((id) => friends.has(id)),
      people: c.people.filter((id) => id !== meId).length,
    }))
    .sort(
      (a, b) =>
        Number(b.mine) - Number(a.mine) ||
        b.friends.length - a.friends.length ||
        b.people - a.people ||
        a.session.started_at.localeCompare(b.session.started_at),
    );
}

// Spec 04: sorted only on opening the tab or pulling to refresh. While it is on screen the order
// holds, a room whose session ended drops out, a new one goes last.
export function keepRoomOrder(
  prev: readonly string[] | null,
  sorted: readonly string[],
): string[] {
  if (!prev) return [...sorted];
  const now = new Set(sorted);
  const kept = prev.filter((id) => now.has(id));
  const known = new Set(kept);
  return [...kept, ...sorted.filter((id) => !known.has(id))];
}
