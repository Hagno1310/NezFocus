import type { VoiceRoomMember } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { keepOrder, orderSeats, ringOrder, ringSeats } from './voiceRooms';

const seat = (
  user_id: string,
  minute: number,
  extra: Partial<VoiceRoomMember> = {},
): VoiceRoomMember => ({
  user_id,
  channel_id: '700',
  server_id: '10',
  self_mute: true,
  self_video: false,
  mod_muted: false,
  joined_at: `2026-11-26T14:${String(minute).padStart(2, '0')}:00.000Z`,
  away: false,
  ...extra,
});

describe('C-18 `voice` order', () => {
  it('me → friends → camera / mic on → joined earlier', () => {
    const seats = [
      seat('stranger-early', 1),
      seat('talker', 5, { self_mute: false }),
      seat('friend', 9),
      seat('me', 10),
      seat('stranger-late', 2),
    ];
    expect(
      orderSeats(seats, 'me', new Set(['friend'])).map((m) => m.user_id),
    ).toEqual(['me', 'friend', 'talker', 'stranger-early', 'stranger-late']);
  });

  it('after the first look newcomers join the end and a mic turned on moves nobody', () => {
    const first = keepOrder(
      null,
      [seat('b', 1), seat('c', 2)],
      'me',
      new Set(),
    );
    const next = keepOrder(
      first,
      [seat('b', 1), seat('c', 2, { self_mute: false }), seat('d', 3)],
      'me',
      new Set(),
    );
    expect(next).toEqual(['b', 'c', 'd']);
  });

  it('joining the room I was previewing puts "Bạn" first; leavers drop out', () => {
    expect(
      keepOrder(['b', 'c'], [seat('c', 2), seat('me', 3)], 'me', new Set()),
    ).toEqual(['me', 'c']);
  });
});

describe('C-06 ring seats (Room Session)', () => {
  it('the Host comes right after me, before friends', () => {
    const seats = [seat('friend', 1), seat('host', 5), seat('me', 9)];
    expect(
      orderSeats(seats, 'me', new Set(['friend']), 'host').map(
        (m) => m.user_id,
      ),
    ).toEqual(['me', 'host', 'friend']);
  });

  it('13+ people: 11 seats and "+N"; a freed seat goes to the highest priority in "+N"', () => {
    const people = Array.from({ length: 13 }, (_, i) => seat(`p${i}`, i + 1));
    const all = [seat('me', 0), ...people, seat('friend', 30)];
    const first = ringOrder(null, all, 'me', new Set(['friend']), null);
    expect(ringSeats(first)).toEqual({
      seated: first.slice(0, 11),
      more: 4,
    });
    expect(first.slice(0, 3)).toEqual(['me', 'friend', 'p0']);
    // p1 leaves: the friend is seated already, so the earliest of "+N" (p9) moves in.
    const after = ringOrder(
      first,
      all.filter((m) => m.user_id !== 'p1'),
      'me',
      new Set(['friend']),
      null,
    );
    expect(after.slice(0, 11)).toEqual([
      'me',
      'friend',
      'p0',
      ...['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
    ]);
    expect(ringSeats(after).seated).toHaveLength(11);
    expect(ringSeats(after).more).toBe(3);
  });

  it('a talker in "+N" takes a freed seat before people who came earlier', () => {
    const people = Array.from({ length: 13 }, (_, i) => seat(`p${i}`, i + 1));
    const first = ringOrder(
      null,
      [seat('me', 0), ...people],
      'me',
      new Set(),
      null,
    );
    const talking = people.map((m) =>
      m.user_id === 'p12' ? { ...m, self_mute: false } : m,
    );
    const next = ringOrder(
      first,
      [seat('me', 0), ...talking.filter((m) => m.user_id !== 'p1')],
      'me',
      new Set(),
      null,
    );
    expect(next[10]).toBe('p12');
  });

  it('12 or fewer: everyone has a seat', () => {
    const ids = ['me', 'a', 'b'];
    expect(ringSeats(ids)).toEqual({ seated: ids, more: 0 });
  });
});
