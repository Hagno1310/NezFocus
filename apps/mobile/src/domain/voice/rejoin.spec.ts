import type { VoiceRoomMember } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { rejoinStep, type SavedRoom } from './rejoin';

const NOW = Date.parse('2026-11-26T21:47:00Z');
const saved = (minutesAgo: number): SavedRoom => ({
  serverId: '10',
  channelId: '700',
  aliveAt: NOW - minutesAgo * 60_000,
});
const seat = (
  extra: Partial<VoiceRoomMember>,
): Record<string, VoiceRoomMember> => ({
  '1': {
    user_id: '1',
    channel_id: '700',
    server_id: '10',
    self_mute: true,
    self_video: false,
    mod_muted: false,
    joined_at: '2026-11-26T21:30:00.000Z',
    away: true,
    ...extra,
  },
});

describe('VC-01 AC6: back into the room after the app was killed', () => {
  it('after 2 minutes, my seat still waiting → rejoin that room', () => {
    expect(rejoinStep(saved(2), NOW, seat({}), '1')).toBe('rejoin');
  });

  it('after 4 minutes → no', () => {
    expect(rejoinStep(saved(4), NOW, seat({}), '1')).toBe('no');
  });

  it('not away (yet): LiveKit has not noticed, or another device sits there → wait and see', () => {
    expect(rejoinStep(saved(1), NOW, seat({ away: false }), '1')).toBe('wait');
  });

  it('the seat is gone or moved → no', () => {
    expect(rejoinStep(saved(1), NOW, {}, '1')).toBe('no');
    expect(rejoinStep(saved(1), NOW, seat({ channel_id: '701' }), '1')).toBe(
      'no',
    );
  });

  it('nothing saved → no', () => {
    expect(rejoinStep(null, NOW, seat({}), '1')).toBe('no');
  });
});
