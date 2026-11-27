import {
  DEFAULT_USER_SETTINGS,
  type DispatchEvent,
  type VoiceState as VoiceStateEvent,
  type VoiceStateUpdate,
} from '@nezfocus/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createFakeVoiceClient } from '../../data/voice/FakeVoiceClient';
import {
  createVoiceSession,
  emptyVoice,
  type VoiceEnd,
  type VoiceState,
} from './voiceSession';

const ME = '1';
const A = { serverId: '10', channelId: '700' };
const B = { serverId: '10', channelId: '701' };

const seatEvent = (
  d: Partial<VoiceStateEvent> & { user_id: string },
): DispatchEvent => ({
  t: 'VOICE_STATE_UPDATE',
  s: 1,
  d: {
    channel_id: A.channelId,
    server_id: A.serverId,
    self_mute: true,
    self_video: false,
    mod_muted: false,
    joined_at: '2026-11-26T14:00:00.000Z',
    away: false,
    ...d,
  },
});
const left = (reason: VoiceStateEvent['reason']) =>
  seatEvent({ user_id: ME, channel_id: null, joined_at: null, reason });

let store: StoreApi<VoiceState>;
let client: ReturnType<typeof createFakeVoiceClient>;
let sent: VoiceStateUpdate[];
let token: ReturnType<
  typeof vi.fn<(channelId: string) => Promise<{ token: string; url: string }>>
>;
let micAllowed: boolean;
let session: ReturnType<typeof createVoiceSession>;
let ends: VoiceEnd[];

beforeEach(() => {
  store = createStore<VoiceState>(() => emptyVoice);
  micAllowed = true;
  client = createFakeVoiceClient({ micAllowed: () => micAllowed });
  sent = [];
  token = vi.fn(async (channelId: string) => ({
    token: `t-${channelId}`,
    url: 'ws://lk',
  }));
  session = createVoiceSession({
    repo: { token },
    client,
    gateway: { updateVoice: (d) => sent.push(d) },
    me: () => ME,
    store,
    wait: async () => {},
  });
  ends = [];
  session.onEnded((e) => ends.push(e));
});

const call = () => store.getState().call;

describe('join (REQ-VC-01, STUDY-02)', () => {
  it('connects LiveKit first, then sends op 4 with the mic off; no mic is asked for', async () => {
    expect(await session.join(A)).toBe('joined');
    expect(client.state.log).toEqual(['connect t-700']);
    expect(sent).toEqual([
      { channel_id: '700', self_mute: true, self_video: false },
    ]);
    expect(call()).toMatchObject({ ...A, phase: 'in', mic: false });
  });

  it('STUDY-02 AC4: Mic turned on in the preview → on as soon as I am in', async () => {
    await session.join(A, { mic: true, camera: false });
    expect(client.state.mic).toBe(true);
    expect(sent.at(-1)).toMatchObject({ self_mute: false });
    expect(call()?.mic).toBe(true);
  });

  it('40302 → no-connect, nothing stays joined', async () => {
    token.mockRejectedValueOnce({ code: 40302 });
    expect(await session.join(A)).toBe('no-connect');
    expect(call()).toBeNull();
    expect(sent).toEqual([]);
  });

  it('40401 → gone', async () => {
    token.mockRejectedValueOnce({ code: 40401 });
    expect(await session.join(A)).toBe('gone');
  });

  it('leaving while the token is on its way: never connects', async () => {
    const joining = session.join(A);
    void session.leave();
    expect(await joining).toBe('cancelled');
    expect(client.state.room).toBeNull();
    expect(sent.filter((d) => d.channel_id)).toEqual([]);
  });

  it('VC-01 AC3: switching leaves A before B, without op 4 null in between', async () => {
    await session.join(A);
    await session.join(B);
    expect(client.state.log).toEqual([
      'connect t-700',
      'disconnect',
      'connect t-701',
    ]);
    expect(sent.map((d) => d.channel_id)).toEqual(['700', '701']);
  });
});

describe('camera (VC-01 AC7, STUDY-02)', () => {
  it('Camera on in the preview → on at once in the room, and no preview step this login', async () => {
    await session.join(A, { mic: false, camera: true });
    expect(client.state.camera).toBe(true);
    expect(sent.at(-1)).toMatchObject({ self_video: true });
    expect(store.getState().cameraPreviewed).toBe(true);
  });

  it('turning it on in the room tells the backend and remembers the preview', async () => {
    await session.join(A);
    expect(store.getState().cameraPreviewed).toBe(false);
    expect(await session.setCamera(true)).toBe(true);
    expect(sent.at(-1)).toMatchObject({ self_video: true, self_mute: true });
    expect(store.getState().cameraPreviewed).toBe(true);
  });

  it('signing out forgets the preview (it is per login)', async () => {
    await session.join(A, { mic: false, camera: true });
    await session.signOut();
    expect(store.getState().cameraPreviewed).toBe(false);
  });
});

describe('leave', () => {
  it('"Rời phòng": op 4 with no channel and LiveKit closed', async () => {
    await session.join(A);
    await session.leave();
    expect(sent.at(-1)).toEqual({
      channel_id: null,
      self_mute: true,
      self_video: false,
    });
    expect(client.state.room).toBeNull();
    expect(call()).toBeNull();
  });
});

describe('mic (STUDY-02 AC2)', () => {
  it('turns on at once and tells the backend', async () => {
    await session.join(A);
    const done = session.setMic(true);
    expect(call()?.mic).toBe(true);
    expect(await done).toBe(true);
    expect(sent.at(-1)).toMatchObject({ channel_id: '700', self_mute: false });
  });

  it('Android refusing puts the button back off', async () => {
    await session.join(A);
    micAllowed = false;
    expect(await session.setMic(true)).toBe(false);
    expect(call()?.mic).toBe(false);
    expect(sent).toHaveLength(1);
  });
});

describe('seats and my seat ending (CR-28 #30)', () => {
  it('READY then VOICE_STATE_UPDATE keep who is in which room', () => {
    session.apply({
      t: 'READY',
      s: 1,
      d: {
        session_id: '1',
        user: {
          id: ME,
          email: 'a@b.c',
          username: 'an',
          display_name: 'An',
          bio: null,
          avatar: null,
          account_completed: true,
          created_at: '2026-10-01T08:00:00.000Z',
        },
        servers: [],
        preferred_status: 'online',
        settings: DEFAULT_USER_SETTINGS,
        presences: [],
        read_states: [],
        relationships: [],
        private_channels: [],
        voice_states: [
          {
            user_id: '2',
            channel_id: '700',
            server_id: '10',
            self_mute: false,
            self_video: false,
            mod_muted: false,
            joined_at: '2026-11-26T14:00:00.000Z',
            away: false,
          },
        ],
        focus_sessions: [],
        backend_time: '2026-11-26T14:00:00.000Z',
      },
    });
    session.apply(seatEvent({ user_id: '3' }));
    session.apply(
      seatEvent({ user_id: '2', channel_id: null, joined_at: null }),
    );
    expect(Object.keys(store.getState().seats)).toEqual(['3']);
  });

  it('a leave from the backend after my seat was confirmed ends the call with its reason', async () => {
    await session.join(A);
    session.apply(seatEvent({ user_id: ME }));
    session.apply(left('channel_deleted'));
    expect(ends).toEqual([{ ...A, reason: 'channel_deleted' }]);
    expect(call()).toBeNull();
    await vi.waitFor(() => expect(client.state.room).toBeNull());
  });

  it('the `switched` leave of room A does not end the call I am joining in B', async () => {
    await session.join(A);
    session.apply(seatEvent({ user_id: ME }));
    await session.join(B);
    session.apply(left('switched'));
    session.apply(seatEvent({ user_id: ME, channel_id: B.channelId }));
    expect(ends).toEqual([]);
    expect(call()).toMatchObject({ ...B, seated: true });
  });

  it('a fresh READY without my seat ends a confirmed call (`left`)', async () => {
    await session.join(A);
    session.apply(seatEvent({ user_id: ME }));
    session.apply({
      t: 'READY',
      s: 1,
      d: { voice_states: [] } as never,
    });
    expect(ends).toEqual([{ ...A, reason: 'left' }]);
  });
});

describe('mod-mute (REQ-VC-04)', () => {
  it('AC1: my seat mod-muted → the mic goes off, op 4 says so, the screen is told; unmute only lets me', async () => {
    let told = 0;
    session.onModMuted(() => told++);
    await session.join(A, { mic: true, camera: false });
    session.apply(seatEvent({ user_id: ME, self_mute: false }));
    session.apply(
      seatEvent({ user_id: ME, self_mute: false, mod_muted: true }),
    );
    expect(call()).toMatchObject({ modMuted: true, mic: false });
    expect(told).toBe(1);
    await vi.waitFor(() => expect(client.state.mic).toBe(false));
    expect(sent.at(-1)).toMatchObject({ self_mute: true });
    expect(await session.setMic(true)).toBe(false);
    session.apply(seatEvent({ user_id: ME, mod_muted: false }));
    expect(call()).toMatchObject({ modMuted: false, mic: false });
    expect(await session.setMic(true)).toBe(true);
  });

  it('AC5: muted before joining → the Mic is `mod-muted` with no Toast', async () => {
    let told = 0;
    session.onModMuted(() => told++);
    await session.join(A);
    session.apply(seatEvent({ user_id: ME, mod_muted: true }));
    expect(call()).toMatchObject({ seated: true, modMuted: true });
    expect(told).toBe(0);
  });

  it('disconnected by a moderator ends the call with its reason', async () => {
    await session.join(A);
    session.apply(seatEvent({ user_id: ME }));
    session.apply(left('disconnected_by_mod'));
    expect(ends).toEqual([{ ...A, reason: 'disconnected_by_mod' }]);
  });
});

describe('never stuck', () => {
  it('leaving while a rejoin waits out its backoff lets the next join go at once', async () => {
    const own = createFakeVoiceClient();
    const forever = createVoiceSession({
      repo: { token },
      client: own,
      gateway: { updateVoice: (d) => sent.push(d) },
      me: () => ME,
      store: createStore<VoiceState>(() => emptyVoice),
      wait: () => new Promise(() => {}), // a backoff that would never end
    });
    await forever.join(A);
    token.mockRejectedValueOnce(new TypeError('Network request failed'));
    own.emit({ type: 'ended', removed: false });
    await vi.waitFor(() => expect(token).toHaveBeenCalledTimes(2));
    await forever.leave();
    expect(await forever.join(B)).toBe('joined');
  });

  it('LiveKit failing to close does not leave a switch spinning', async () => {
    await session.join(A);
    client.disconnect = () => Promise.reject(new Error('audio session'));
    expect(await session.join(B)).toBe('joined');
  });
});

describe('LiveKit link', () => {
  it('poor quality from LiveKit marks the tile (REQ-VC-05)', async () => {
    await session.join(A);
    client.emit({ type: 'quality', poor: ['2'] });
    expect(store.getState().poor).toEqual(['2']);
    await session.leave();
    expect(store.getState().poor).toEqual([]);
  });

  it('speakers come from LiveKit active speakers (REQ-VC-02)', async () => {
    await session.join(A);
    client.emit({ type: 'speakers', userIds: ['2'] });
    expect(store.getState().speaking).toEqual(['2']);
  });

  it('LiveKit giving up on the network: a new token, same room, same mic', async () => {
    await session.join(A, { mic: true, camera: false });
    client.emit({ type: 'ended', removed: false });
    await vi.waitFor(() => expect(token).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(call()?.link).toBe('connected'));
    expect(client.state.mic).toBe(true);
  });

  it('removed by the server: waits for the Gateway reason instead of rejoining', async () => {
    await session.join(A);
    client.emit({ type: 'ended', removed: true });
    expect(call()?.link).toBe('reconnecting');
    expect(token).toHaveBeenCalledTimes(1);
  });
});

it('signing out drops everything without op 4 (the backend left me with `logout`)', async () => {
  await session.join(A);
  await session.signOut();
  expect(sent).toHaveLength(1);
  expect(store.getState()).toEqual(emptyVoice);
});
