import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '@nezfocus/shared';
import type { DispatchEvent, PresenceEvent } from '@nezfocus/shared';
import {
  createIdleTimer,
  createPresenceSync,
  presenceStore,
  emptyPresence,
  IDLE_AFTER_MS,
  reducePresence,
} from './presence';

const event = (e: Omit<DispatchEvent, 's'>) =>
  ({ ...e, s: 1 }) as DispatchEvent;
const binh: PresenceEvent = { user_id: '2', status: 'online', activity: null };

describe('presence store (REQ-AUTH-05)', () => {
  it('READY gives my chosen status and the people already online', () => {
    const s = reducePresence(
      emptyPresence,
      event({
        t: 'READY',
        d: {
          session_id: '1',
          user: {} as never,
          servers: [],
          preferred_status: 'invisible',
          settings: DEFAULT_USER_SETTINGS,
          presences: [binh],
        },
      }),
    );
    expect(s.mine).toBe('invisible');
    expect(s.others['2']).toEqual(binh);
  });

  it('PRESENCE_UPDATE replaces that person; offline with nothing to show is dropped', () => {
    let s = reducePresence(
      emptyPresence,
      event({ t: 'PRESENCE_UPDATE', d: binh }),
    );
    s = reducePresence(
      s,
      event({ t: 'PRESENCE_UPDATE', d: { ...binh, status: 'idle' } }),
    );
    expect(s.others['2']?.status).toBe('idle');
    s = reducePresence(
      s,
      event({ t: 'PRESENCE_UPDATE', d: { ...binh, status: 'offline' } }),
    );
    expect(s.others['2']).toBeUndefined();
  });

  it('other events leave it as it is', () => {
    expect(reducePresence(emptyPresence, event({ t: 'RESUMED', d: {} }))).toBe(
      emptyPresence,
    );
  });
});

describe('idle timer (AUTH-05 AC1, app side)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports afk after 10 minutes without a touch, and active again on the next touch', () => {
    const changes: boolean[] = [];
    const t = createIdleTimer((afk) => changes.push(afk));
    t.start();
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1);
    expect(changes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([true]);
    t.touch();
    expect(changes).toEqual([true, false]);
  });

  it('a touch restarts the 10 minutes and says nothing while already active', () => {
    const changes: boolean[] = [];
    const t = createIdleTimer((afk) => changes.push(afk));
    t.start();
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1000);
    t.touch();
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1000);
    expect(changes).toEqual([]);
  });

  it('stops counting in the background (the backend uses APP_STATE there); back in front = active', () => {
    const changes: boolean[] = [];
    const t = createIdleTimer((afk) => changes.push(afk));
    t.start();
    vi.advanceTimersByTime(IDLE_AFTER_MS);
    t.stop();
    vi.advanceTimersByTime(IDLE_AFTER_MS * 3);
    t.start();
    expect(changes).toEqual([true, false]);
  });
});

describe('presence sync (op 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    presenceStore.setState(emptyPresence);
  });
  afterEach(() => vi.useRealTimers());

  const make = () => {
    const sent: unknown[] = [];
    const sync = createPresenceSync({ setPresence: (p) => sent.push(p) });
    return { sent, sync };
  };

  it("AC2: setMine('invisible') → my store is Invisible and op 3 carries it", () => {
    const { sent, sync } = make();
    sync.setMine('invisible');
    expect(presenceStore.getState().mine).toBe('invisible');
    expect(sent.at(-1)).toEqual({ status: 'invisible', afk: false });
  });

  it('AC1: 10 minutes without a touch in the foreground → afk alone, never my status (another device may have changed it)', () => {
    const { sent, sync } = make();
    sync.setMine('dnd');
    sync.setForeground(true);
    vi.advanceTimersByTime(IDLE_AFTER_MS);
    expect(sent.at(-1)).toEqual({ afk: true });
    sync.touch();
    expect(sent.at(-1)).toEqual({ afk: false });
  });

  it('does not send for a touch that changes nothing', () => {
    const { sent, sync } = make();
    sync.setForeground(true);
    const before = sent.length;
    sync.touch();
    expect(sent.length).toBe(before);
  });
});
