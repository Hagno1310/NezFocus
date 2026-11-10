import {
  GatewayOp,
  type PresenceEvent,
  type SoloSession,
} from '@nezfocus/shared';
import { GatewaySessions } from './gateway-sessions.js';
import { LIVE_WINDOW_MS, SWEEP_MS } from './presence.js';
import type {
  PresenceRepository,
  PresenceSettings,
} from './presence.repository.js';
import { PresenceService } from './presence.service.js';

// An (1) and Bình (2) share a server; Chi (3) shares none with An.
const shared: Record<string, bigint[]> = { '1': [2n], '2': [1n], '3': [] };

let settings: Map<bigint, PresenceSettings>;
let saved: [bigint, string][];
const repo = {
  settings: async (u: bigint) =>
    settings.get(u) ?? { preferred: 'online', showActivity: true },
  savePreferred: async (u: bigint, s: string) => {
    saved.push([u, s]);
  },
  receivers: async (u: bigint) => shared[u.toString()] ?? [],
} as unknown as PresenceRepository;

let nextId = 1n;
let sessions: GatewaySessions;
let presence: PresenceService;
const inbox = new Map<bigint, PresenceEvent[]>();

const connect = async (userId: bigint) => {
  const socket = {
    sendText(text: string) {
      const f = JSON.parse(text);
      if (f.op === GatewayOp.DISPATCH && f.t === 'PRESENCE_UPDATE')
        inbox.set(userId, [...(inbox.get(userId) ?? []), f.d]);
    },
    close() {},
  };
  const session = sessions.create(userId, nextId++, socket);
  const ready = await presence.ready(userId);
  await presence.changed(userId);
  return { session, socket, ready };
};
const lastSeenBy = (receiver: bigint) => inbox.get(receiver)?.at(-1);
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T14:47:00Z'));
  settings = new Map();
  saved = [];
  inbox.clear();
  sessions = new GatewaySessions({ next: () => nextId++ });
  presence = new PresenceService(sessions, repo);
  presence.onModuleInit();
});
afterEach(() => {
  presence.onModuleDestroy();
  vi.useRealTimers();
});

describe('PresenceService (REQ-AUTH-05)', () => {
  it('broadcasts online to members of a shared server only', async () => {
    await connect(2n);
    await connect(1n);
    expect(lastSeenBy(2n)).toEqual({
      user_id: '1',
      status: 'online',
      activity: null,
    });
    expect(inbox.get(3n)).toBeUndefined();
  });

  it('READY carries my chosen status and the presences already online', async () => {
    settings.set(1n, { preferred: 'dnd', showActivity: true });
    await connect(2n);
    const { ready } = await connect(1n);
    expect(ready.preferred_status).toBe('dnd');
    expect(ready.presences).toEqual([
      { user_id: '2', status: 'online', activity: null },
    ]);
  });

  it('AC1: afk on every device → idle; a touch → online again', async () => {
    await connect(2n);
    const { session } = await connect(1n);
    await presence.update(session, { status: 'online', afk: true });
    expect(lastSeenBy(2n)?.status).toBe('idle');
    await presence.update(session, { status: 'online', afk: false });
    expect(lastSeenBy(2n)?.status).toBe('online');
    expect(saved).toEqual([]); // the manual status did not change
  });

  it('AC1: 5 minutes in the background with the socket alive → idle, found by the sweep', async () => {
    await connect(2n);
    const { session } = await connect(1n);
    sessions.setAppState(session, 'background');
    await presence.changed(1n);
    expect(lastSeenBy(2n)?.status).toBe('online');
    // heartbeats keep the device live while it sits in the background
    for (let t = 0; t < 5 * 60_000; t += SWEEP_MS) {
      sessions.touch(session);
      await vi.advanceTimersByTimeAsync(SWEEP_MS);
    }
    expect(lastSeenBy(2n)?.status).toBe('idle');
  });

  it('AC2: Invisible → others get offline with no activity; preferred_status is saved', async () => {
    await connect(2n);
    const { session } = await connect(1n);
    presence.soloChanged(1n, solo);
    await flush();
    await presence.update(session, { status: 'invisible', afk: false });
    expect(lastSeenBy(2n)).toEqual({
      user_id: '1',
      status: 'offline',
      activity: null,
    });
    expect(saved).toEqual([[1n, 'invisible']]);
  });

  it('AC3: every device gone → offline within 60 s', async () => {
    await connect(2n);
    const { session } = await connect(1n);
    sessions.detach(session, session.socket!);
    await vi.advanceTimersByTimeAsync(SWEEP_MS);
    expect(lastSeenBy(2n)?.status).toBe('offline');
  });

  it('AC3: a device that went silent (network lost) is offline within 60 s', async () => {
    await connect(2n);
    await connect(1n);
    await vi.advanceTimersByTimeAsync(LIVE_WINDOW_MS);
    expect(lastSeenBy(2n)?.status).toBe('online');
    await vi.advanceTimersByTimeAsync(60_000 - LIVE_WINDOW_MS);
    expect(lastSeenBy(2n)?.status).toBe('offline');
  });

  it('online if one of several devices is active', async () => {
    await connect(2n);
    const a = await connect(1n);
    await connect(1n);
    await presence.update(a.session, { status: 'online', afk: true });
    expect(lastSeenBy(2n)?.status).toBe('online');
  });

  it('solo activity reaches the receivers, follows the phase, and is gone when Solo stops', async () => {
    await connect(2n);
    await connect(1n);
    presence.soloChanged(1n, solo);
    await flush();
    expect(lastSeenBy(2n)?.activity).toEqual({
      kind: 'solo',
      phase: 'focus',
      state: 'running',
      phase_ends_at: solo.phase_ends_at,
    });
    presence.soloChanged(1n, { ...solo, status: 'ended' });
    await flush();
    expect(lastSeenBy(2n)?.activity).toBeNull();
  });

  it('AC5 (here): show_study_activity off → no activity, status still sent', async () => {
    settings.set(1n, { preferred: 'online', showActivity: false });
    await connect(2n);
    await connect(1n);
    presence.soloChanged(1n, solo);
    await flush();
    expect(lastSeenBy(2n)).toEqual({
      user_id: '1',
      status: 'online',
      activity: null,
    });
  });

  it('turning show_study_activity back on re-sends the activity (P1-A5.1 calls settingsChanged)', async () => {
    settings.set(1n, { preferred: 'online', showActivity: false });
    await connect(2n);
    await connect(1n);
    presence.soloChanged(1n, solo);
    await flush();
    settings.set(1n, { preferred: 'online', showActivity: true });
    await presence.settingsChanged(1n);
    expect(lastSeenBy(2n)?.activity?.kind).toBe('solo');
  });

  it('an afk-only frame from another device keeps the status picked elsewhere (Invisible stays)', async () => {
    await connect(2n);
    const a = await connect(1n);
    const b = await connect(1n);
    await presence.update(a.session, { status: 'invisible', afk: false });
    await presence.update(b.session, { afk: true });
    expect(lastSeenBy(2n)?.status).toBe('offline');
    expect(saved).toEqual([[1n, 'invisible']]);
  });

  it('a slower, older change never lands after a newer one', async () => {
    await connect(2n);
    const { session } = await connect(1n);
    let release!: () => void;
    const slow = new Promise<void>((r) => (release = r));
    const receivers = repo.receivers;
    let first = true;
    repo.receivers = async (u: bigint) => {
      if (first) {
        first = false;
        await slow;
      }
      return receivers(u);
    };
    session.afk = true;
    const older = presence.changed(1n); // computes idle, waits on the slow query
    session.afk = false;
    sessions.setAppState(session, 'foreground');
    await presence.update(session, { afk: false }); // back to online, sent at once
    release();
    await older;
    repo.receivers = receivers;
    expect(lastSeenBy(2n)?.status).toBe('online');
  });

  it('sends nothing when nothing visible changed', async () => {
    await connect(2n);
    const { session } = await connect(1n);
    const before = inbox.get(2n)?.length;
    sessions.touch(session);
    await presence.changed(1n);
    await vi.advanceTimersByTimeAsync(SWEEP_MS);
    expect(inbox.get(2n)?.length).toBe(before);
  });
});

const solo: SoloSession = {
  id: '5',
  status: 'running',
  phase: 'focus',
  cycle_config: { focus_min: 50, short_break_min: 10 },
  next_cycle_config: null,
  focus_phases_done: 0,
  phase_ends_at: '2026-10-18T15:21:00.000Z',
  paused_remaining_ms: null,
  waiting_since: null,
  started_at: '2026-10-18T14:29:00.000Z',
  ended_at: null,
  end_reason: null,
  focused_seconds: 0,
  days: [],
  hit_daily_cap: false,
};
