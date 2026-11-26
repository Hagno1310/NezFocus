import { describe, expect, it } from 'vitest';
import { ClientFrame, GatewayOp } from '../gateway/gateway.contract.js';
import { parseDispatch } from '../gateway/events.contract.js';
import {
  CreateVoiceTokenRequest,
  UpdateMemberVoiceRequest,
  VoiceRoomMember,
} from './voice.contract.js';

const ROOM = '1234567890123';
const CALL = '9876543210987';

describe('CreateVoiceTokenRequest (SRS 5.3 Voice, CR-28 #30)', () => {
  it('takes a voice channel or a call', () => {
    expect(CreateVoiceTokenRequest.parse({ channel_id: ROOM })).toEqual({
      channel_id: ROOM,
    });
    expect(CreateVoiceTokenRequest.parse({ call_id: CALL })).toEqual({
      call_id: CALL,
    });
  });

  it('refuses neither and both', () => {
    expect(CreateVoiceTokenRequest.safeParse({}).success).toBe(false);
    expect(
      CreateVoiceTokenRequest.safeParse({ channel_id: ROOM, call_id: CALL })
        .success,
    ).toBe(false);
  });
});

describe('UpdateMemberVoiceRequest (REQ-VC-04, CR-28 #31)', () => {
  it('mutes, unmutes or disconnects', () => {
    expect(UpdateMemberVoiceRequest.parse({ mute: true })).toEqual({
      mute: true,
    });
    expect(UpdateMemberVoiceRequest.parse({ mute: false })).toEqual({
      mute: false,
    });
    expect(UpdateMemberVoiceRequest.parse({ disconnect: true })).toEqual({
      disconnect: true,
    });
  });

  it('refuses an empty body and disconnect: false', () => {
    expect(UpdateMemberVoiceRequest.safeParse({}).success).toBe(false);
    expect(
      UpdateMemberVoiceRequest.safeParse({ disconnect: false }).success,
    ).toBe(false);
  });
});

describe('op 4 VOICE_STATE_UPDATE (SRS 5.4, CR-28 #30)', () => {
  it('joins, leaves, and has no self_deaf', () => {
    const join = ClientFrame.parse({
      op: GatewayOp.VOICE_STATE_UPDATE,
      d: { channel_id: ROOM, self_mute: true, self_video: false },
    });
    expect(join.d).toEqual({
      channel_id: ROOM,
      self_mute: true,
      self_video: false,
    });
    const leave = ClientFrame.parse({
      op: GatewayOp.VOICE_STATE_UPDATE,
      d: { channel_id: null, self_mute: true, self_video: false },
    });
    expect(leave.d).toMatchObject({ channel_id: null });
  });
});

describe('DISPATCH VOICE_STATE_UPDATE', () => {
  const state = {
    user_id: '1111111111111',
    channel_id: ROOM,
    server_id: '2222222222222',
    self_mute: false,
    self_video: false,
    mod_muted: false,
    joined_at: '2026-10-18T14:47:00.000Z',
    away: false,
  };

  it('carries a seat, and a reason only on the leaver’s own copy', () => {
    expect(
      parseDispatch({ op: 0, t: 'VOICE_STATE_UPDATE', s: 1, d: state }),
    ).toMatchObject({ d: state });
    const left = {
      ...state,
      channel_id: null,
      joined_at: null,
      reason: 'other_device',
    };
    expect(
      parseDispatch({ op: 0, t: 'VOICE_STATE_UPDATE', s: 2, d: left })?.d,
    ).toEqual(left);
  });

  it('refuses an unknown reason', () => {
    expect(() =>
      parseDispatch({
        op: 0,
        t: 'VOICE_STATE_UPDATE',
        s: 3,
        d: { ...state, channel_id: null, reason: 'bored' },
      }),
    ).toThrow();
  });
});

describe('READY.voice_states', () => {
  it('only lists people sitting in a room', () => {
    const member = {
      user_id: '1111111111111',
      channel_id: ROOM,
      server_id: '2222222222222',
      self_mute: true,
      self_video: false,
      mod_muted: false,
      joined_at: '2026-10-18T14:47:00.000Z',
      away: true,
    };
    expect(VoiceRoomMember.parse(member)).toEqual(member);
    expect(
      VoiceRoomMember.safeParse({ ...member, channel_id: null }).success,
    ).toBe(false);
  });
});
