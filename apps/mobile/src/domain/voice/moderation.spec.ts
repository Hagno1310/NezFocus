import { Permission, type VoiceRoomMember } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { moderatorVoiceRows } from './moderation';

const server = {
  id: '10',
  ownerId: 'an',
  roles: [
    { id: '10', permissions: 0n, position: 0 },
    { id: 'mod', permissions: 0n, position: 2 },
    { id: 'member', permissions: 0n, position: 1 },
  ],
};
const chi = { userId: 'chi', roleIds: ['mod'] };
const dung = { userId: 'dung', roleIds: ['member'] };
const seat = (extra: Partial<VoiceRoomMember> = {}): VoiceRoomMember => ({
  user_id: 'dung',
  channel_id: '700',
  server_id: '10',
  self_mute: true,
  self_video: false,
  mod_muted: false,
  joined_at: '2026-11-26T20:00:00.000Z',
  away: false,
  ...extra,
});
const BOTH = Permission.MUTE_MEMBERS | Permission.MOVE_MEMBERS;

describe('S-HOME-10 `moderator-voice`', () => {
  it('in a room of the server, with both bits: "Tắt mic" and "Ngắt khỏi phòng"', () => {
    expect(
      moderatorVoiceRows({
        server,
        me: chi,
        them: dung,
        seat: seat(),
        roomPerms: BOTH,
      }),
    ).toEqual({ mute: 'mute', disconnect: true });
  });

  it('mod-muted already → "Bật lại mic"', () => {
    expect(
      moderatorVoiceRows({
        server,
        me: chi,
        them: dung,
        seat: seat({ mod_muted: true }),
        roomPerms: BOTH,
      }).mute,
    ).toBe('unmute');
  });

  it('each row needs its own bit', () => {
    expect(
      moderatorVoiceRows({
        server,
        me: chi,
        them: dung,
        seat: seat(),
        roomPerms: Permission.MOVE_MEMBERS,
      }),
    ).toEqual({ mute: null, disconnect: true });
  });

  it('not in a room, or in another server’s room → nothing', () => {
    const none = { mute: null, disconnect: false };
    expect(
      moderatorVoiceRows({
        server,
        me: chi,
        them: dung,
        seat: undefined,
        roomPerms: BOTH,
      }),
    ).toEqual(none);
    expect(
      moderatorVoiceRows({
        server,
        me: chi,
        them: dung,
        seat: seat({ server_id: '11' }),
        roomPerms: BOTH,
      }),
    ).toEqual(none);
  });

  it('VC-04 AC4: level with or above, or the Owner → nothing', () => {
    const none = { mute: null, disconnect: false };
    expect(
      moderatorVoiceRows({
        server,
        me: dung,
        them: chi,
        seat: seat({ user_id: 'chi' }),
        roomPerms: BOTH,
      }),
    ).toEqual(none);
    expect(
      moderatorVoiceRows({
        server,
        me: chi,
        them: { userId: 'an', roleIds: [] },
        seat: seat({ user_id: 'an' }),
        roomPerms: BOTH,
      }),
    ).toEqual(none);
  });
});
