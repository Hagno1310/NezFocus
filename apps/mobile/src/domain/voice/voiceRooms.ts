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

// C-18 `voice` / C-06 without the Host step: me → friends → camera or mic on → joined earlier.
export function orderSeats(
  seats: readonly VoiceRoomMember[],
  me: string | null,
  friends: ReadonlySet<string>,
): VoiceRoomMember[] {
  const rank = (m: VoiceRoomMember) =>
    m.user_id === me
      ? 0
      : friends.has(m.user_id)
        ? 1
        : m.self_video || !m.self_mute
          ? 2
          : 3;
  return [...seats].sort(
    (a, b) => rank(a) - rank(b) || a.joined_at.localeCompare(b.joined_at),
  );
}

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
