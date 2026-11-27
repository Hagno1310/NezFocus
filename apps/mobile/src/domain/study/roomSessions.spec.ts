import type {
  DispatchEvent,
  FocusSessionEnd,
  FocusSessionState,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  emptyRoomSessions,
  reduceRoomSessions,
  todayMinutesNow,
} from './roomSessions';
import { session } from './roomSessions.fixture';

const at = (hhmmss: string) => Date.parse(`2026-10-18T${hhmmss}.000Z`);

const ready = (focus_sessions: FocusSessionState[], backend_time: string) =>
  ({
    t: 'READY',
    d: { focus_sessions, backend_time },
  }) as unknown as DispatchEvent;

const update = (
  t: 'FOCUS_SESSION_START' | 'FOCUS_SESSION_UPDATE',
  s: FocusSessionState,
  backend_time: string,
) => ({ t, d: { focus_session: s, backend_time } }) as unknown as DispatchEvent;

const end = (focused_seconds: number | null): DispatchEvent => ({
  t: 'FOCUS_SESSION_END',
  s: 1,
  d: {
    id: '900',
    channel_id: '700',
    server_id: '10',
    ended_at: '2026-10-18T14:50:00.000Z',
    end_reason: 'stopped',
    ended_by: '2',
    focused_seconds,
  } satisfies FocusSessionEnd,
});

describe('Room Sessions from the Gateway (CR-28 #38)', () => {
  it('READY lists every running session by channel and sets the clock offset (7.3.6 step 1)', () => {
    // The phone runs 2 minutes behind the backend (STUDY-01 AC1).
    const s = reduceRoomSessions(
      emptyRoomSessions,
      ready([session()], '2026-10-18T14:47:00.000Z'),
      at('14:45:00'),
    );
    expect(s.byChannel['700']?.id).toBe('900');
    expect(s.offsetMs).toBe(2 * 60_000);
  });

  it('START and UPDATE replace the channel’s session; a small offset wobble keeps the old offset', () => {
    let s = reduceRoomSessions(
      emptyRoomSessions,
      ready([], '2026-10-18T14:47:00.000Z'),
      at('14:47:00'),
    );
    s = reduceRoomSessions(
      s,
      update(
        'FOCUS_SESSION_UPDATE',
        session({ status: 'paused' }),
        '2026-10-18T14:48:00.400Z',
      ),
      at('14:48:00'),
    );
    expect(s.byChannel['700']?.status).toBe('paused');
    expect(s.offsetMs).toBe(0);
    s = reduceRoomSessions(
      s,
      update('FOCUS_SESSION_START', session(), '2026-10-18T14:52:00.000Z'),
      at('14:49:00'),
    );
    expect(s.offsetMs).toBe(3 * 60_000);
  });

  it('END removes the session and keeps my summary only when I took part', () => {
    const running = reduceRoomSessions(
      emptyRoomSessions,
      ready([session()], '2026-10-18T14:47:00.000Z'),
      at('14:47:00'),
    );
    const mine = reduceRoomSessions(running, end(31 * 60), at('14:50:00'));
    expect(mine.byChannel['700']).toBeUndefined();
    expect(mine.ended['700']?.focused_seconds).toBe(31 * 60);
    const theirs = reduceRoomSessions(running, end(null), at('14:50:00'));
    expect(theirs.ended['700']).toBeUndefined();
  });

  it('a new session in the room drops the old summary (S-ROOM-EDGE › sheet tổng kết còn bao lâu)', () => {
    let s = reduceRoomSessions(
      emptyRoomSessions,
      ready([session()], '2026-10-18T14:47:00.000Z'),
      at('14:47:00'),
    );
    s = reduceRoomSessions(s, end(60), at('14:50:00'));
    s = reduceRoomSessions(
      s,
      update(
        'FOCUS_SESSION_START',
        session({ id: '901' }),
        '2026-10-18T14:51:00.000Z',
      ),
      at('14:51:00'),
    );
    expect(s.ended['700']).toBeUndefined();
  });
});

describe('"Bạn đã tập trung {N} phút hôm nay"', () => {
  it('adds the stretch still counting to the minutes the backend credited (spec 03: 39 + 6 = 45)', () => {
    expect(todayMinutesNow(39, session(), 0, at('14:47:00'))).toBe(45);
  });

  it('is the credited minutes alone in a break, paused, or with no session', () => {
    const paused = session({
      status: 'paused',
      phase_ends_at: null,
      me: { focused_seconds: 31 * 60, counting_since: null },
    });
    expect(todayMinutesNow(45, paused, 0, at('14:47:00'))).toBe(45);
    expect(todayMinutesNow(45, null, 0, at('14:47:00'))).toBe(45);
  });
});

describe('who paused (C-06 `paused`), kept past a cycle edit', () => {
  it('remembers the pause until the session runs again', () => {
    const paused = {
      status: 'paused' as const,
      phase_ends_at: null,
      paused_remaining_ms: 600_000,
    };
    let s = reduceRoomSessions(
      emptyRoomSessions,
      update(
        'FOCUS_SESSION_UPDATE',
        session({ ...paused, last_action: { by: '1', action: 'pause' } }),
        '2026-10-18T14:47:00.000Z',
      ),
      at('14:47:00'),
    );
    s = reduceRoomSessions(
      s,
      update(
        'FOCUS_SESSION_UPDATE',
        session({ ...paused, last_action: { by: '3', action: 'config' } }),
        '2026-10-18T14:48:00.000Z',
      ),
      at('14:48:00'),
    );
    expect(s.pausedBy['900']).toBe('1');
    s = reduceRoomSessions(
      s,
      update('FOCUS_SESSION_UPDATE', session(), '2026-10-18T14:49:00.000Z'),
      at('14:49:00'),
    );
    expect(s.pausedBy['900']).toBeUndefined();
  });
});
