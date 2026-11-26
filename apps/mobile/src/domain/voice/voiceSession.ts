import {
  ErrorCode,
  type DispatchEvent,
  type VoiceLeaveReason,
} from '@nezfocus/shared';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { asApiError } from '../auth/authFlow';
import type { GatewayClient } from '../gateway/GatewayClient';
import type {
  VoiceClient,
  VoiceClientEvent,
  VoiceLink,
  VoiceRepository,
} from './VoiceClient';
import { reduceSeats, type VoiceSeats } from './voiceRooms';

export type VoiceTarget = { serverId: string; channelId: string };

// The room I am in on this phone. `seated`: the backend has confirmed my seat in it (my own
// VOICE_STATE_UPDATE), so a leave from the backend is about this room and not an older one.
export type VoiceCall = VoiceTarget & {
  phase: 'joining' | 'in';
  link: VoiceLink;
  mic: boolean;
  camera: boolean;
  seated: boolean;
  modMuted: boolean; // REQ-VC-04: a moderator took my mic in this server
};

export type VoiceState = {
  seats: VoiceSeats;
  call: VoiceCall | null;
  speaking: readonly string[];
  poor: readonly string[]; // C-07 `poor-network` (REQ-VC-05)
  // REQ-VC-01: the camera was seen once this login (preview Camera or `camera-self-preview`),
  // so turning it on in a room goes straight on (VC-01 AC7).
  cameraPreviewed: boolean;
};

export const emptyVoice: VoiceState = {
  seats: {},
  call: null,
  speaking: [],
  poor: [],
  cameraPreviewed: false,
};

export type VoiceMedia = { mic: boolean; camera: boolean };

export const voiceStore = createStore<VoiceState>(() => emptyVoice);

// The backend ended my seat (CR-28 #30): the screen picks the Toast / Dialog by reason.
export type VoiceEnd = VoiceTarget & { reason: VoiceLeaveReason };

export type JoinResult =
  | 'joined'
  | 'no-connect' // 40302: no CONNECT, or timed out (S-ROOM-01 `no-connect`)
  | 'gone' // 40401: the channel is not there for me any more
  | 'failed'
  | 'cancelled'; // left or switched while joining

const RETRY_MS = [1000, 2000, 5000, 10_000, 30_000];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createVoiceSession({
  repo,
  client,
  gateway,
  me,
  store = voiceStore,
  wait = sleep,
}: {
  repo: VoiceRepository;
  client: VoiceClient;
  gateway: Pick<GatewayClient, 'updateVoice'>;
  me: () => string | null;
  store?: StoreApi<VoiceState>;
  wait?: (ms: number) => Promise<void>;
}) {
  const endListeners = new Set<(end: VoiceEnd) => void>();
  const mutedListeners = new Set<() => void>();
  // One LiveKit room at a time: connect / disconnect / publish run one after another.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = chain.then(task, task);
    chain = next.catch(() => {});
    return next;
  };
  // Bumped by every join / leave: work started for an older call stops.
  let gen = 0;
  const call = () => store.getState().call;
  const patch = (id: number, next: Partial<VoiceCall>) => {
    const c = call();
    if (gen === id && c) store.setState({ call: { ...c, ...next } });
  };

  const sendState = (c: VoiceCall) =>
    gateway.updateVoice({
      channel_id: c.channelId,
      self_mute: !c.mic,
      self_video: c.camera,
    });

  // A retry waiting out its backoff stops at once when the call changes (leave, switch).
  let wake: (() => void) | null = null;
  const pause = (ms: number) =>
    Promise.race([
      wait(ms),
      new Promise<void>((r) => {
        wake = r;
      }),
    ]);

  const reset = (extra: Partial<VoiceState> = {}) => {
    gen++;
    wake?.();
    store.setState({ call: null, speaking: [], poor: [], ...extra });
  };

  // LiveKit or the native audio session failing to close must not leave a join spinning.
  const disconnect = () => client.disconnect().catch(() => {});

  const publish = (on: boolean, set: (on: boolean) => Promise<void>) =>
    on
      ? set(true).then(
          () => true,
          () => false,
        )
      : Promise.resolve(false);

  // REQ-VC-01: op 4 only after LiveKit has connected; mic and camera only when asked for
  // (STUDY-02 AC1, AC4; VC-01 AC7).
  async function connect(id: number, channelId: string, media: VoiceMedia) {
    const grant = await repo.token(channelId);
    if (gen !== id) return false;
    await client.connect(grant.url, grant.token);
    if (gen !== id) {
      await disconnect();
      return false;
    }
    const mic = await publish(media.mic, client.setMic);
    const camera = await publish(media.camera, client.setCamera);
    patch(id, { phase: 'in', link: 'connected', mic, camera });
    const c = call();
    if (c) sendState(c);
    return true;
  }

  function join(
    target: VoiceTarget,
    media: VoiceMedia = { mic: false, camera: false },
  ): Promise<JoinResult> {
    const prev = call();
    if (prev?.channelId === target.channelId) return Promise.resolve('joined');
    // Switching (VC-01 AC3): the backend moves the seat on the next op 4 (`switched`).
    reset({
      call: {
        ...target,
        phase: 'joining',
        link: 'connecting',
        mic: false,
        camera: false,
        seated: false,
        modMuted: false,
      },
    });
    const id = gen;
    return serial(async () => {
      if (gen !== id) return 'cancelled';
      if (prev) await disconnect();
      try {
        if (media.camera) store.setState({ cameraPreviewed: true });
        return (await connect(id, target.channelId, media))
          ? 'joined'
          : 'cancelled';
      } catch (err) {
        if (gen !== id) return 'cancelled';
        reset();
        await disconnect();
        const code = asApiError(err)?.code;
        if (code === ErrorCode.Forbidden) return 'no-connect';
        if (code === ErrorCode.NotFound) return 'gone';
        return 'failed';
      }
    });
  }

  // "Rời phòng": op 4 with no channel is the only leave the backend does at once.
  function leave() {
    if (!call()) return Promise.resolve();
    reset();
    gateway.updateVoice({
      channel_id: null,
      self_mute: true,
      self_video: false,
    });
    return serial(disconnect);
  }

  // STUDY-02 AC2: the button turns on at once; Android refusing puts it back.
  function toggle(kind: keyof VoiceMedia, on: boolean): Promise<boolean> {
    const c = call();
    if (!c || c.phase !== 'in') return Promise.resolve(false);
    if (kind === 'mic' && on && c.modMuted) return Promise.resolve(false);
    const id = gen;
    patch(id, { [kind]: on });
    if (kind === 'camera' && on) store.setState({ cameraPreviewed: true });
    return serial(async () => {
      if (gen !== id) return false;
      try {
        await (kind === 'mic' ? client.setMic : client.setCamera)(on);
      } catch {
        patch(id, { [kind]: false });
        return false;
      }
      const now = call();
      if (gen === id && now) sendState(now);
      return true;
    });
  }

  // LiveKit gave up on the network by itself: a new token and the same room, same media, until
  // the backend says the seat is gone or I leave.
  // One retry loop per call: a second `ended` while it runs changes nothing.
  let rejoining = -1;
  function rejoin(id: number) {
    patch(id, { link: 'reconnecting' });
    if (rejoining === id) return;
    rejoining = id;
    void serial(async () => {
      for (let attempt = 0; gen === id; attempt++) {
        const c = call();
        if (!c) return;
        try {
          if (await connect(id, c.channelId, c)) return;
        } catch (err) {
          const code = asApiError(err)?.code;
          if (code === ErrorCode.Forbidden || code === ErrorCode.NotFound) {
            // Lost CONNECT or the channel: the backend's VOICE_STATE_UPDATE tells the reason.
            return;
          }
        }
        await pause(RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]!);
      }
    }).finally(() => {
      if (rejoining === id) rejoining = -1;
    });
  }

  function onClientEvent(event: VoiceClientEvent) {
    const c = call();
    if (!c) return;
    if (event.type === 'speakers') store.setState({ speaking: event.userIds });
    else if (event.type === 'quality') store.setState({ poor: event.poor });
    else if (event.type === 'link') {
      if (c.phase === 'in') patch(gen, { link: event.state });
    } else if (event.removed) patch(gen, { link: 'reconnecting' });
    else if (c.phase === 'in') rejoin(gen);
  }
  client.onEvent(onClientEvent);

  // READY / VOICE_STATE_UPDATE: who sits where, and my own seat ending.
  function apply(event: DispatchEvent) {
    const s = store.getState();
    const seats = reduceSeats(s.seats, event);
    const mine = me();
    let c = s.call;
    let ended = false;
    let muted = false;
    let told = false;
    if (c && mine) {
      const seat = seats[mine];
      if (seat?.channel_id === c.channelId) {
        // AC5: already muted when I join → just the button, no Toast (only a change is told).
        told = c.seated && seat.mod_muted && !c.modMuted;
        if (!c.seated) c = { ...c, seated: true };
        // VC-04 AC1: LiveKit already stopped the mic; the button follows.
        muted = seat.mod_muted && !c.modMuted;
        if (seat.mod_muted !== c.modMuted)
          c = {
            ...c,
            modMuted: seat.mod_muted,
            mic: seat.mod_muted ? false : c.mic,
          };
      } else if (
        c.seated &&
        (event.t === 'READY' || event.t === 'VOICE_STATE_UPDATE')
      )
        ended = true;
    }
    if (!ended) {
      store.setState({ seats, call: c });
      if (muted && s.call?.mic) {
        const id = gen;
        void serial(async () => {
          await client.setMic(false).catch(() => {});
          const now = call();
          if (gen === id && now) sendState(now);
        });
      }
      if (told) mutedListeners.forEach((l) => l());
      return;
    }
    const end: VoiceEnd = {
      serverId: c!.serverId,
      channelId: c!.channelId,
      reason: (event.t === 'VOICE_STATE_UPDATE' && event.d.reason) || 'left',
    };
    reset({ seats });
    void serial(disconnect);
    endListeners.forEach((l) => l(end));
  }

  // Signed out: the backend already freed the seat (`logout`), so no op 4.
  function signOut() {
    reset({ seats: {}, cameraPreviewed: false });
    return serial(disconnect);
  }

  return {
    join,
    leave,
    setMic: (on: boolean) => toggle('mic', on),
    setCamera: (on: boolean) => toggle('camera', on),
    apply,
    signOut,
    onEnded(listener: (end: VoiceEnd) => void) {
      endListeners.add(listener);
      return () => {
        endListeners.delete(listener);
      };
    },
    // S-ROOM-02 `mod-muted`: "Bạn đã bị người quản lý tắt mic".
    onModMuted(listener: () => void) {
      mutedListeners.add(listener);
      return () => {
        mutedListeners.delete(listener);
      };
    },
  };
}

export type VoiceSession = ReturnType<typeof createVoiceSession>;
