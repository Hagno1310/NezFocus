import type { DispatchEvent, VoiceRoomMember } from '@nezfocus/shared';

// Who sits in which voice room, by user id (one seat per account, VC-01): READY.voice_states,
// then VOICE_STATE_UPDATE (CR-28 #30).
export type VoiceSeats = Readonly<Record<string, VoiceRoomMember>>;

export function reduceSeats(
  seats: VoiceSeats,
  event: DispatchEvent,
): VoiceSeats {
  if (event.t === 'READY')
    return Object.fromEntries(event.d.voice_states.map((m) => [m.user_id, m]));
  if (event.t !== 'VOICE_STATE_UPDATE') return seats;
  const { reason: _, ...d } = event.d;
  const { [d.user_id]: __, ...rest } = seats;
  if (d.channel_id === null || d.joined_at === null) return rest;
  return {
    ...rest,
    [d.user_id]: { ...d, channel_id: d.channel_id, joined_at: d.joined_at },
  };
}

export const seatsIn = (seats: VoiceSeats, channelId: string) =>
  Object.values(seats).filter((m) => m.channel_id === channelId);

// C-18 `voice` / C-06: me → Host (Room Session only) → friends → camera or mic on → joined earlier.
export function orderSeats(
  seats: readonly VoiceRoomMember[],
  me: string | null,
  friends: ReadonlySet<string>,
  host: string | null = null,
): VoiceRoomMember[] {
  const rank = (m: VoiceRoomMember) =>
    m.user_id === me
      ? 0
      : m.user_id === host
        ? 1
        : friends.has(m.user_id)
          ? 2
          : m.self_video || !m.self_mute
            ? 3
            : 4;
  return [...seats].sort(
    (a, b) => rank(a) - rank(b) || a.joined_at.localeCompare(b.joined_at),
  );
}

// C-06 › Xếp ghế: 12 seats; from 13 people 11 seats and "+N".
const RING_MAX = 12;
const RING_SEATED = 11;

// keepOrder for the ring, with "+N" kept in priority order so a freed seat goes to its first.
export function ringOrder(
  prev: readonly string[] | null,
  seats: readonly VoiceRoomMember[],
  me: string | null,
  friends: ReadonlySet<string>,
  host: string | null,
): string[] {
  const ids = prev
    ? keepOrder(prev, seats, me, friends)
    : orderSeats(seats, me, friends, host).map((m) => m.user_id);
  if (ids.length <= RING_MAX) return ids;
  // Whoever sat keeps the seat; only freed seats are filled, by priority.
  const sat = new Set(
    (prev ?? ids).slice(0, ringSeats(prev ?? ids).seated.length),
  );
  const head = ids
    .filter((id) => id === me || sat.has(id))
    .slice(0, RING_SEATED);
  const seated = new Set(head);
  const rest = orderSeats(
    seats.filter((m) => !seated.has(m.user_id)),
    me,
    friends,
    host,
  ).map((m) => m.user_id);
  return [...head, ...rest];
}

export const ringSeats = (ids: readonly string[]) =>
  ids.length <= RING_MAX
    ? { seated: [...ids], more: 0 }
    : { seated: ids.slice(0, RING_SEATED), more: ids.length - RING_SEATED };

// C-18 (chốt 17/10/2026): the first look is sorted, then newcomers join the end and nobody
// moves when they turn a mic on, so starting a session never reshuffles the grid. "Bạn" is
// always first, also when I join a room I was previewing.
export function keepOrder(
  prev: readonly string[] | null,
  seats: readonly VoiceRoomMember[],
  me: string | null,
  friends: ReadonlySet<string>,
): string[] {
  if (!prev) return orderSeats(seats, me, friends).map((m) => m.user_id);
  const here = new Set(seats.map((m) => m.user_id));
  const kept = prev.filter((id) => here.has(id) && id !== me);
  const known = new Set(kept);
  const added = seats
    .filter((m) => !known.has(m.user_id) && m.user_id !== me)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .map((m) => m.user_id);
  return [...(me && here.has(me) ? [me] : []), ...kept, ...added];
}

// Under 80% the ring would read as a different component: below that the body scrolls.
const MIN_RING_SCALE = 0.8;

// C-06 on a phone shorter than the frame: the ring's scale so what is under it ends at `box`.
// `contentH` was laid out with the ring at `measuredAt`.
export function ringScale(
  box: number,
  contentH: number,
  measuredAt: number,
  side: number,
): number {
  const rest = contentH - side * measuredAt;
  return Math.min(1, Math.max(MIN_RING_SCALE, (box - rest) / side));
}
