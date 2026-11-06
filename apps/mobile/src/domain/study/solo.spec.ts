import type { SoloSession, SoloSessionResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  acceptSnapshot,
  applyLocally,
  endingOf,
  receiveSoloEvent,
  restoreSolo,
  snapshotOf,
  timerOf,
  type SoloMemory,
  type SoloRepository,
} from './solo';

// Scenario of spec 04: 50/10, round 1 started 21:29; at 21:47 there are 32:10 left.
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 18, h, m, s);
const iso = (d: Date) => d.toISOString();

const session = (over: Partial<SoloSession> = {}): SoloSession => ({
  id: '42',
  status: 'running',
  phase: 'focus',
  cycle_config: { focus_min: 50, short_break_min: 10 },
  next_cycle_config: null,
  focus_phases_done: 0,
  phase_ends_at: iso(at(22, 19)),
  paused_remaining_ms: null,
  waiting_since: null,
  started_at: iso(at(21, 29)),
  ended_at: null,
  end_reason: null,
  focused_seconds: 0,
  days: [],
  hit_daily_cap: false,
  ...over,
});

const snap = (over: Partial<SoloSession> = {}, stoppedHere = false) => ({
  session: session(over),
  offsetMs: 0,
  stoppedHere,
});

const ended = (over: Partial<SoloSession> = {}) => ({
  status: 'ended' as const,
  phase_ends_at: null,
  ended_at: iso(at(21, 46)),
  end_reason: 'stopped' as const,
  focused_seconds: 75 * 60,
  ...over,
});

describe('timerOf', () => {
  it('focus counts down to the phase end and names the next break', () => {
    expect(timerOf(snap(), at(21, 47, 50))).toMatchObject({
      status: 'running',
      phase: 'focus',
      remainingMs: (31 * 60 + 10) * 1000,
      round: 1,
      next: { phase: 'break', at: at(22, 19) },
      long: false,
      due: false,
    });
  });

  it('clock_offset (SRS 7.3.6): a phone 2 minutes fast still shows the backend time left', () => {
    const fast = { ...snap(), offsetMs: -2 * 60_000 };
    expect(timerOf(fast, at(21, 49, 50))?.remainingMs).toBe(
      (31 * 60 + 10) * 1000,
    );
  });

  it('a fresh phase never reads more than its length (network delay in the offset)', () => {
    const fresh = {
      ...snap({ phase_ends_at: iso(at(22, 19)) }),
      offsetMs: -400,
    };
    expect(timerOf(fresh, at(21, 29))?.remainingMs).toBe(50 * 60_000);
  });

  it('with long breaks on, the next break is named: long after every N rounds', () => {
    const cfg = {
      focus_min: 50,
      short_break_min: 10,
      long_break_min: 30,
      long_break_every: 2,
    };
    const first = timerOf(snap({ cycle_config: cfg }), at(21, 47));
    const second = timerOf(
      snap({ cycle_config: cfg, focus_phases_done: 1 }),
      at(21, 47),
    );
    expect(first?.next?.phase).toBe('short_break');
    expect(second).toMatchObject({ round: 2, next: { phase: 'long_break' } });
  });

  it('a break shows when it ends; Solo then waits instead of starting focus', () => {
    const view = timerOf(
      snap({
        phase: 'short_break',
        focus_phases_done: 1,
        phase_ends_at: iso(at(21, 54)),
      }),
      at(21, 47, 20),
    );
    expect(view).toMatchObject({
      remainingMs: (6 * 60 + 40) * 1000,
      next: { phase: 'focus', at: at(21, 54) },
    });
  });

  it('paused freezes the time left', () => {
    const view = timerOf(
      snap({
        status: 'paused',
        phase_ends_at: null,
        paused_remaining_ms: 32 * 60_000,
      }),
      at(23, 0),
    );
    expect(view).toMatchObject({
      status: 'paused',
      remainingMs: 32 * 60_000,
      next: null,
    });
  });

  it('AC4: waiting counts down the 10 minutes from the break end', () => {
    const view = timerOf(
      snap({
        status: 'waiting',
        phase: 'short_break',
        phase_ends_at: null,
        waiting_since: iso(at(21, 45)),
      }),
      at(21, 46, 48),
    );
    expect(view).toMatchObject({
      status: 'waiting',
      remainingMs: (8 * 60 + 12) * 1000,
    });
  });

  it('is due (ask the backend) once the phase or the wait runs out, never negative', () => {
    expect(timerOf(snap(), at(22, 20))).toMatchObject({
      remainingMs: 0,
      due: true,
    });
  });

  it('a 100+ minute phase uses the long timer size for the whole phase', () => {
    const view = timerOf(
      snap({ cycle_config: { focus_min: 120, short_break_min: 30 } }),
      at(22, 18),
    );
    expect(view?.long).toBe(true);
  });

  it('carries the pending config (STUDY-11 AC6: "Từ vòng sau")', () => {
    const next = { focus_min: 25, short_break_min: 5 };
    expect(
      timerOf(snap({ next_cycle_config: next }), at(21, 47))?.pending,
    ).toEqual(next);
  });

  it('an ended session has no timer', () => {
    expect(timerOf(snap(ended()), at(21, 47))).toBeNull();
  });
});

describe('endingOf', () => {
  it('AC6: stopped here → summary with the minutes the backend credited', () => {
    expect(endingOf(snap(ended(), true))).toMatchObject({
      kind: 'summary',
      minutes: 75,
      days: null,
      hitCap: false,
    });
  });

  it('AC5: a wait that ran out → expired at the end of the break', () => {
    const view = endingOf(
      snap(ended({ end_reason: 'wait_timeout', ended_at: iso(at(21, 45)) })),
    );
    expect(view).toMatchObject({ kind: 'expired', endedAt: at(21, 45) });
  });

  it('stopped and not by this device → stopped-other-device', () => {
    expect(endingOf(snap(ended(), false))?.kind).toBe('stopped-other-device');
  });

  it('DEC-24: under 1 minute → too-short', () => {
    expect(endingOf(snap(ended({ focused_seconds: 59 }), true))?.kind).toBe(
      'too-short',
    );
  });

  it('midnight: two days split as yesterday / today; long-session flags the cap', () => {
    const view = endingOf(
      snap(
        ended({
          focused_seconds: 70 * 60,
          days: [
            { local_date: '2026-10-18', focused_seconds: 30 * 60 },
            { local_date: '2026-10-19', focused_seconds: 40 * 60 },
          ],
          hit_daily_cap: true,
        }),
        true,
      ),
    );
    expect(view).toMatchObject({
      kind: 'summary',
      days: { yesterday: 30, today: 40 },
      hitCap: true,
    });
  });

  it('a running session has no ending', () => {
    expect(endingOf(snap())).toBeNull();
  });
});

describe('applyLocally (offline, until the backend answers)', () => {
  it('pause freezes the time left; resume runs it again from now', () => {
    const paused = applyLocally(session(), { action: 'pause' }, at(21, 47));
    expect(paused).toMatchObject({
      status: 'paused',
      phase_ends_at: null,
      paused_remaining_ms: 32 * 60_000,
    });
    expect(
      applyLocally(paused!, { action: 'resume' }, at(22, 0)),
    ).toMatchObject({
      status: 'running',
      phase_ends_at: iso(at(22, 32)),
      paused_remaining_ms: null,
    });
  });

  it('stop ends now without asking (AC6)', () => {
    expect(
      applyLocally(session(), { action: 'stop' }, at(21, 47)),
    ).toMatchObject({
      status: 'ended',
      end_reason: 'stopped',
      ended_at: iso(at(21, 47)),
    });
  });

  it('actions that need the backend phase rules wait for it', () => {
    expect(applyLocally(session(), { action: 'skip' }, at(21, 47))).toBeNull();
  });
});

describe('restoreSolo (STUDY-10 AC3)', () => {
  const response = (s: SoloSession | null, now = at(21, 47)) => ({
    solo_session: s,
    backend_time: iso(now),
  });
  const memory = (id: string | null = null, stopped: string | null = null) => {
    const m: SoloMemory & { id: string | null } = {
      id,
      lastId: async () => m.id,
      remember: async (next: string) => {
        m.id = next;
      },
      forget: async () => {
        m.id = null;
        stopped = null;
      },
      stoppedHere: async () => stopped,
      markStoppedHere: async (next: string) => {
        stopped = next;
      },
    };
    return m;
  };
  const repo = (
    current: SoloSession | null,
    byId: SoloSession | null = null,
  ): SoloRepository => ({
    start: async () => response(session()) as SoloSessionResponse,
    current: async () => response(current),
    get: async () => {
      if (!byId) throw new Error('404');
      return response(byId) as SoloSessionResponse;
    },
    act: async () => response(session()) as SoloSessionResponse,
  });
  const now = () => at(21, 47).getTime();

  it('an active session comes back where the backend says, and is remembered', async () => {
    const mem = memory();
    const restored = await restoreSolo(repo(session()), mem, null, now);
    expect(restored?.session.id).toBe('42');
    expect(mem.id).toBe('42');
  });

  it('nothing active and nothing remembered → no session', async () => {
    expect(await restoreSolo(repo(null), memory(), null, now)).toBeNull();
  });

  it('nothing active but the last session ended unseen → its ending (ended-expired)', async () => {
    const expired = session(ended({ end_reason: 'wait_timeout' }));
    const restored = await restoreSolo(
      repo(null, expired),
      memory('42'),
      null,
      now,
    );
    expect(endingOf(restored!)?.kind).toBe('expired');
  });

  it('our own stop that landed just before an app kill restores as our summary, not another device', async () => {
    const stopped = session(ended());
    const restored = await restoreSolo(
      repo(null, stopped),
      memory('42', '42'),
      null,
      now,
    );
    expect(endingOf(restored!)?.kind).toBe('summary');
  });

  it('a remembered session that is gone forgets it', async () => {
    const mem = memory('42');
    expect(await restoreSolo(repo(null), mem, null, now)).toBeNull();
    expect(mem.id).toBeNull();
  });

  it('an ending on screen stays until "Xong", even when the app refetches', async () => {
    const shown = snap(ended(), true);
    expect(await restoreSolo(repo(null), memory(), shown, now)).toBe(shown);
  });
});

describe('receiveSoloEvent (SOLO_SESSION_UPDATE)', () => {
  const event = (s: SoloSession, backend = at(21, 47)) => ({
    solo_session: s,
    backend_time: iso(backend),
  });

  it('replaces the session and recomputes the offset', () => {
    const next = receiveSoloEvent(
      snap(),
      event(session({ status: 'paused' }), at(21, 47)),
      at(21, 48).getTime(),
    );
    expect(next).toMatchObject({
      session: { status: 'paused' },
      offsetMs: -60_000,
    });
  });

  it('a stop from another device ends this one as stopped-other-device', () => {
    const next = receiveSoloEvent(snap(), event(session(ended())), 0);
    expect(endingOf(next!)?.kind).toBe('stopped-other-device');
  });

  it('the echo of our own stop stays ours', () => {
    const next = receiveSoloEvent(
      snap(ended(), true),
      event(session(ended())),
      0,
    );
    expect(endingOf(next!)?.kind).toBe('summary');
  });

  it('an ended session we are not showing is ignored', () => {
    expect(receiveSoloEvent(null, event(session(ended())), 0)).toBeNull();
  });

  it('a session started on another device appears here', () => {
    expect(receiveSoloEvent(null, event(session()), 0)?.session.id).toBe('42');
  });
});

describe('snapshotOf (SRS 7.3.6 clock_offset)', () => {
  const r = { solo_session: session(), backend_time: iso(at(21, 47)) };
  const t0 = at(21, 47).getTime();

  it('without a send time: backend_time − receive time', () => {
    expect(snapshotOf(r, { received: t0 + 3000 }).offsetMs).toBe(-3000);
  });

  it('with a send time: backend_time − the midpoint of the round trip', () => {
    expect(snapshotOf(r, { sent: t0 - 200, received: t0 + 400 }).offsetMs).toBe(
      -100,
    );
  });

  it('keeps the previous offset when a new one differs by under a second, so the clock never jumps', () => {
    const prev = { ...snap(), offsetMs: -100 };
    expect(snapshotOf(r, { received: t0 + 700 }, false, prev).offsetMs).toBe(
      -100,
    );
    expect(snapshotOf(r, { received: t0 + 5000 }, false, prev).offsetMs).toBe(
      -5000,
    );
  });
});

describe('acceptSnapshot (stale answers never undo an ending)', () => {
  const running = snap();
  const stopped = snap(ended(), true);

  it('takes a newer state of the shown session', () => {
    expect(acceptSnapshot(running, stopped, null)).toBe(stopped);
  });

  it('an ended session never goes back to running (a late answer from before "Dừng")', () => {
    expect(acceptSnapshot(stopped, running, null)).toBe(stopped);
  });

  it('a session closed with "Xong" stays closed', () => {
    expect(acceptSnapshot(null, running, '42')).toBeNull();
  });

  it('a different session (started on another device) is taken', () => {
    const other = snap({ id: '43' });
    expect(acceptSnapshot(stopped, other, '42')).toBe(other);
  });
});
