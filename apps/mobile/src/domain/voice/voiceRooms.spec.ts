import type { VoiceRoomMember } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { keepOrder, orderSeats } from './voiceRooms';

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
