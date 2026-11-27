import type { FocusSessionState } from './room-session.contract.js';
import {
  clockOffsetMs,
  myFocusedSeconds,
  roomClockAt,
  roomTimer,
} from './room-timer.js';

const MIN = 60_000;
const T0 = Date.parse('2026-10-18T14:00:00Z'); // 21:00 in Hà Nội
const iso = (t: number) => new Date(t).toISOString();

// A 25/5 session started at T0, as the backend sends it.
const session = (over: Partial<FocusSessionState> = {}): FocusSessionState => ({
  id: '1',
  channel_id: '2',
  server_id: '3',
  status: 'running',
  phase: 'focus',
  cycle_config: { focus_min: 25, short_break_min: 5 },
  next_cycle_config: null,
  focus_phases_done: 0,
  phase_ends_at: iso(T0 + 25 * MIN),
  paused_remaining_ms: null,
  host_id: '9',
  started_at: iso(T0),
  last_action: null,
  me: null,
  ...over,
});

describe('roomTimer (REQ-STUDY-01, SRS 7.3.6)', () => {
  it('AC3: joining at minute 12 of a 25-minute focus shows 13:00 left', () => {
    const t = roomTimer(session(), 0, T0 + 12 * MIN);
    expect(t).toMatchObject({
      phase: 'focus',
      remainingMs: 13 * MIN,
      round: 1,
    });
  });

  it('AC1: a phone 2 minutes fast shows the same time through backend_time', () => {
    const skew = 2 * MIN;
    const received = T0 + 12 * MIN + skew; // the phone clock when backend_time (T0 + 12) arrived
    const offset = clockOffsetMs(iso(T0 + 12 * MIN), { received });
    expect(offset).toBe(-skew);
    expect(roomTimer(session(), offset, received + 1000).remainingMs).toBe(
      13 * MIN - 1000,
    );
  });

  it('the offset stands for the middle of the round trip', () => {
    expect(clockOffsetMs(iso(T0), { sent: T0 - 400, received: T0 + 400 })).toBe(
      0,
    );
  });

  it('AC5: paused with 10:00 left still shows 10:00 three minutes later, and after Resume', () => {
    const paused = session({
      status: 'paused',
      phase_ends_at: null,
      paused_remaining_ms: 10 * MIN,
    });
    expect(roomTimer(paused, 0, T0 + 18 * MIN).remainingMs).toBe(10 * MIN);
    const resumeAt = T0 + 18 * MIN;
    const resumed = session({ phase_ends_at: iso(resumeAt + 10 * MIN) });
    expect(roomTimer(resumed, 0, resumeAt).remainingMs).toBe(10 * MIN);
  });

  it('a break ends into focus by itself (4.9.1: a Room Session never waits)', () => {
    // 25 focus + 5 break, then 2 minutes into round 2
    const t = roomTimer(session(), 0, T0 + 32 * MIN);
    expect(t).toMatchObject({
      phase: 'focus',
      remainingMs: 23 * MIN,
      round: 2,
      status: 'running',
    });
  });

  it('reopening after several phases jumps to the current one (7.3.6 step 4)', () => {
    const c = roomClockAt(session(), T0 + 95 * MIN); // 3 rounds of 30, then 5 minutes in
    expect(c).toMatchObject({ phase: 'focus', focus_phases_done: 3 });
    expect(c.phase_ends_at).toBe(iso(T0 + 115 * MIN));
  });

  it('STUDY-11 AC6: 25/5 → 50/10 at minute 20 keeps 5:00 now, then 50/10', () => {
    const s = session({
      next_cycle_config: { focus_min: 50, short_break_min: 10 },
    });
    expect(roomTimer(s, 0, T0 + 20 * MIN)).toMatchObject({
      remainingMs: 5 * MIN,
      pending: { focus_min: 50, short_break_min: 10 },
    });
    // the break after this focus already uses the new config: 10 minutes
    const brk = roomTimer(s, 0, T0 + 26 * MIN);
    expect(brk).toMatchObject({
      phase: 'short_break',
      remainingMs: 9 * MIN,
      pending: null,
      totalMs: 10 * MIN,
    });
    expect(roomTimer(s, 0, T0 + 36 * MIN)).toMatchObject({
      phase: 'focus',
      remainingMs: 49 * MIN,
    });
  });

  it('a long break replaces the short one after every N focus phases', () => {
    const s = session({
      cycle_config: {
        focus_min: 25,
        short_break_min: 5,
        long_break_min: 15,
        long_break_every: 2,
      },
    });
    const first = roomTimer(s, 0, T0 + 26 * MIN);
    expect(first).toMatchObject({ phase: 'short_break' });
    // focus 25, short 5, focus 25 → long 15 from minute 55
    const second = roomTimer(s, 0, T0 + 56 * MIN);
    expect(second).toMatchObject({
      phase: 'long_break',
      remainingMs: 14 * MIN,
      round: 2,
    });
    expect(roomTimer(s, 0, T0 + 71 * MIN)).toMatchObject({
      phase: 'focus',
      round: 3,
    });
  });

  it('tells what comes next: the break after a focus, focus after a break', () => {
    expect(roomTimer(session(), 0, T0).next).toEqual({
      phase: 'short_break',
      at: iso(T0 + 25 * MIN),
    });
    expect(roomTimer(session(), 0, T0 + 26 * MIN).next).toEqual({
      phase: 'focus',
      at: iso(T0 + 30 * MIN),
    });
    expect(
      roomTimer(
        session({
          status: 'paused',
          phase_ends_at: null,
          paused_remaining_ms: MIN,
        }),
        0,
        T0,
      ).next,
    ).toBeNull();
  });

  it('C-06: a phase of 100+ minutes is long the whole phase', () => {
    const s = session({
      cycle_config: { focus_min: 120, short_break_min: 10 },
      phase_ends_at: iso(T0 + 120 * MIN),
    });
    expect(roomTimer(s, 0, T0 + 119 * MIN).long).toBe(true);
    expect(roomTimer(session(), 0, T0).long).toBe(false);
  });

  it('a late answer never shows more than the phase length', () => {
    expect(roomTimer(session(), 0, T0 - 5000).remainingMs).toBe(25 * MIN);
  });
});

describe('myFocusedSeconds (REQ-STUDY-15, CR-28 #38)', () => {
  const me = (counting: number | null) => ({
    focused_seconds: 600,
    counting_since: counting === null ? null : iso(counting),
  });

  it('adds the running part to what is credited', () => {
    const s = session({ me: me(T0 + 5 * MIN) });
    expect(myFocusedSeconds(s, 0, T0 + 12 * MIN)).toBe(600 + 7 * 60);
  });

  it('stops at the end of the focus phase until the backend credits it', () => {
    const s = session({ me: me(T0 + 5 * MIN) });
    expect(myFocusedSeconds(s, 0, T0 + 40 * MIN)).toBe(600 + 20 * 60);
  });

  it('not counting (break, paused) → only what is credited; not a Participant → null', () => {
    expect(myFocusedSeconds(session({ me: me(null) }), 0, T0 + MIN)).toBe(600);
    expect(myFocusedSeconds(session(), 0, T0)).toBeNull();
  });
});
