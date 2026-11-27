import {
  roomTimer,
  type FocusSessionEnd,
  type FocusSessionState,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  countLine,
  cycleLines,
  leftToast,
  nextPhaseOf,
  roomNotice,
  summaryOf,
  roleChip,
  roomControls,
  subLine,
  successorOf,
  type RoomViewInput,
} from './roomView';
import { session } from './roomSessions.fixture';

const at = (hhmmss: string) => Date.parse(`2026-10-18T${hhmmss}.000Z`);

// 21:47 local = 14:47Z; An is "1".
const input = (
  s: Partial<FocusSessionState> = {},
  extra: Partial<RoomViewInput> = {},
): RoomViewInput => {
  const f = session(s);
  return {
    session: f,
    timer: roomTimer(f, 0, at('14:47:00')),
    meId: '1',
    joined: true,
    canManage: false,
    others: 8,
    syncing: false,
    justJoined: false,
    todayMinutes: 45,
    seated: new Set(['1', '2', '3']),
    hostLeft: null,
    pausedBy: null,
    ...extra,
  };
};

describe('S-ROOM-02 role chip and button row (STUDY-11)', () => {
  it('Host → "Bạn đang điều khiển" and the Host row', () => {
    const v = input();
    expect(roleChip(v)).toEqual({ kind: 'me' });
    expect(roomControls(v)).toBe('host');
  });

  it('Participant → "{Host} đang điều khiển" and Mic · Camera · Rời phòng', () => {
    const v = input({ host_id: '2' });
    expect(roleChip(v)).toEqual({ kind: 'other', userId: '2' });
    expect(roomControls(v)).toBe('participant');
  });

  it('MANAGE_STUDY_ROOMS gets the Host row without being Host', () => {
    expect(roomControls(input({ host_id: '2' }, { canManage: true }))).toBe(
      'host',
    );
  });

  it('no Host: "Chưa có người điều khiển"; paused → everyone gets Tiếp tục (CR-22)', () => {
    expect(roleChip(input({ host_id: null }))).toEqual({ kind: 'none' });
    expect(roomControls(input({ host_id: null }))).toBe('participant');
    const paused = input({
      host_id: null,
      status: 'paused',
      phase_ends_at: null,
      paused_remaining_ms: 18 * 60_000 + 42_000,
    });
    expect(roomControls(paused)).toBe('resume');
  });

  it('not in the room: no chip', () => {
    expect(roleChip(input({}, { joined: false }))).toBeNull();
  });
});

describe('S-ROOM-02 lines', () => {
  it('focus: "Vòng 2 · nghỉ ngắn lúc 22:06", "8 người đang Tập trung cùng bạn", today’s minutes', () => {
    const v = input();
    expect(cycleLines(v)).toEqual([
      {
        key: 'round',
        round: 2,
        next: 'short_break',
        at: '2026-10-18T15:06:00.000Z',
      },
    ]);
    expect(countLine(v)).toEqual({ key: 'focusWith', n: 8 });
    expect(subLine(v)).toEqual({ key: 'today', minutes: 45 });
  });

  it('short break: "Tập trung lại lúc 22:11", "Cả phòng đang nghỉ ngắn", the stretch line', () => {
    const v = input(
      {
        phase: 'short_break',
        focus_phases_done: 2,
        phase_ends_at: '2026-10-18T15:11:00.000Z',
      },
      { timer: undefined },
    );
    v.timer = roomTimer(v.session, 0, at('15:07:40'));
    expect(cycleLines(v)).toEqual([
      { key: 'breakEnds', at: '2026-10-18T15:11:00.000Z' },
    ]);
    expect(countLine(v)).toEqual({ key: 'shortBreak' });
    expect(subLine(v)).toEqual({ key: 'stretch', minutes: 3 });
  });

  it('long break: "Vòng 4 xong · tập trung lại lúc 21:58"', () => {
    const f = {
      phase: 'long_break' as const,
      focus_phases_done: 4,
      cycle_config: {
        focus_min: 25,
        short_break_min: 5,
        long_break_min: 15,
        long_break_every: 4,
      },
      phase_ends_at: '2026-10-18T14:58:00.000Z',
    };
    const v = input(f);
    expect(countLine(v)).toEqual({ key: 'longBreak' });
    expect(subLine(v)).toEqual({
      key: 'roundDone',
      round: 4,
      at: '2026-10-18T14:58:00.000Z',
    });
  });

  it('paused by me / by Bình / with no Host', () => {
    const paused = {
      status: 'paused' as const,
      phase_ends_at: null,
      paused_remaining_ms: 18 * 60_000 + 42_000,
    };
    const mine = input({
      ...paused,
      last_action: { by: '1', action: 'pause' },
    });
    expect(cycleLines(mine)).toEqual([{ key: 'pausedByMe' }]);
    expect(countLine(mine)).toEqual({ key: 'waitingWith', n: 8 });
    expect(subLine(mine)).toEqual({ key: 'pausedNote' });
    const theirs = input({
      ...paused,
      host_id: '2',
      last_action: { by: '2', action: 'pause' },
    });
    expect(cycleLines(theirs)).toEqual([{ key: 'pausedBy', userId: '2' }]);
    const noHost = input({ ...paused, host_id: null });
    expect(cycleLines(noHost)).toEqual([{ key: 'pressResume' }]);
    expect(subLine(noHost)).toEqual({ key: 'noHost' });
  });

  it('a pending config adds "Từ vòng sau: 50/10", also while paused', () => {
    const next = { focus_min: 50, short_break_min: 10 };
    expect(cycleLines(input({ next_cycle_config: next }))[1]).toEqual({
      key: 'pending',
      cycle: next,
    });
    const paused = input({
      status: 'paused',
      phase_ends_at: null,
      paused_remaining_ms: 600_000,
      next_cycle_config: next,
    });
    expect(cycleLines(paused)[1]).toEqual({ key: 'pending', cycle: next });
  });

  it('syncing: "Đang đồng bộ lại…" in place of the cycle line', () => {
    expect(cycleLines(input({}, { syncing: true }))).toEqual([
      { key: 'syncing' },
    ]);
  });

  it('alone: "Bạn đang học một mình trong phòng này", no sub line', () => {
    const v = input({}, { others: 0 });
    expect(countLine(v)).toEqual({ key: 'alone' });
    expect(subLine(v)).toBeNull();
  });

  it('late-join: "Bạn vừa vào · được tính từ 21:47" until the first minute', () => {
    const v = input(
      {
        me: { focused_seconds: 0, counting_since: '2026-10-18T14:47:00.000Z' },
      },
      { justJoined: true },
    );
    expect(subLine(v)).toEqual({
      key: 'joinedAt',
      at: '2026-10-18T14:47:00.000Z',
    });
  });

  it('preview: "8 người đang Tập trung" and "Phiên học bắt đầu lúc 21:11"', () => {
    const v = input({ me: null }, { joined: false });
    expect(countLine(v)).toEqual({ key: 'focusing', n: 8 });
    expect(subLine(v)).toEqual({
      key: 'startedAt',
      at: '2026-10-18T14:11:00.000Z',
    });
  });
});

describe('STUDY-11 the next Host (S-ROOM-05 host-leave)', () => {
  const seat = (user_id: string, joined_at: string) => ({ user_id, joined_at });
  const seats = [
    seat('1', '2026-10-18T14:00:00.000Z'), // An, leaving
    seat('3', '2026-10-18T14:20:00.000Z'),
    seat('2', '2026-10-18T14:05:00.000Z'), // Bình, longest after An
  ];

  it('the longest stay after me takes over when anyone may start', () => {
    expect(successorOf(seats, '1', 'everyone', () => false)).toBe('2');
  });

  it('managers only: the longest stay who has MANAGE_STUDY_ROOMS', () => {
    expect(successorOf(seats, '1', 'managers', (id) => id === '3')).toBe('3');
  });

  it('nobody may: null (no-successor)', () => {
    expect(successorOf(seats, '1', 'managers', () => false)).toBeNull();
  });
});

describe('S-ROOM-02 Toasts from an UPDATE', () => {
  it('host-transferred: the Host seat comes to me → "Bạn đang điều khiển phiên học"', () => {
    const prev = session({ host_id: '2' });
    expect(roomNotice(prev, session({ host_id: '1' }), '1')).toEqual({
      key: 'hostToMe',
      from: '2',
    });
  });

  it('host-left-paused: to me while paused → "Bình đã rời phòng · bạn đang điều khiển phiên học"', () => {
    const paused = {
      status: 'paused' as const,
      phase_ends_at: null,
      paused_remaining_ms: 600_000,
    };
    expect(
      roomNotice(
        session({ ...paused, host_id: '2' }),
        session({ ...paused, host_id: '1' }),
        '1',
      ),
    ).toEqual({ key: 'hostLeftToMe', from: '2' });
  });

  it('someone else takes over → "Chi đang điều khiển phiên học"; nobody → no Toast', () => {
    expect(
      roomNotice(session({ host_id: '2' }), session({ host_id: '3' }), '1'),
    ).toEqual({ key: 'hostToOther', to: '3' });
    expect(
      roomNotice(session({ host_id: '2' }), session({ host_id: null }), '1'),
    ).toBeNull();
  });

  it('no-host-paused: a member resumes → "Bình đã tiếp tục phiên học" for everyone else', () => {
    const prev = session({
      host_id: null,
      status: 'paused',
      phase_ends_at: null,
      paused_remaining_ms: 600_000,
    });
    const next = session({
      host_id: null,
      last_action: { by: '2', action: 'resume' },
    });
    expect(roomNotice(prev, next, '1')).toEqual({ key: 'resumedBy', by: '2' });
    expect(roomNotice(prev, next, '2')).toBeNull();
  });
});

describe('S-ROOM-EDGE summary and leaving', () => {
  const end = (extra: Partial<FocusSessionEnd>): FocusSessionEnd => ({
    id: '900',
    channel_id: '700',
    server_id: '10',
    ended_at: '2026-10-18T14:47:00.000Z',
    end_reason: 'stopped',
    ended_by: '2',
    focused_seconds: 31 * 60,
    ...extra,
  });

  it('host-stopped / ended-self-host / ended-focus-off (STUDY-01 AC10)', () => {
    expect(summaryOf(end({}), '1')).toEqual({
      reason: { key: 'stoppedBy', by: '2' },
      minutes: 31,
    });
    expect(summaryOf(end({ ended_by: '1' }), '1').reason).toEqual({
      key: 'stoppedByMe',
    });
    expect(
      summaryOf(end({ end_reason: 'focus_disabled' }), '1').reason,
    ).toEqual({ key: 'focusOffBy', by: '2' });
  });

  it('under a minute: no minutes ("Chưa đủ 1 phút trong phiên này")', () => {
    expect(summaryOf(end({ focused_seconds: 59 }), '1').minutes).toBeNull();
  });

  it('left-room-toast: minutes counted, none yet, or never a Participant', () => {
    expect(leftToast(31 * 60 + 20)).toEqual({
      key: 'leftMinutes',
      minutes: 31,
    });
    expect(leftToast(40)).toEqual({ key: 'leftNone' });
    expect(leftToast(null)).toEqual({ key: 'left' });
  });
});

describe('Review fixes (#149)', () => {
  const paused = {
    status: 'paused' as const,
    phase_ends_at: null,
    paused_remaining_ms: 600_000,
  };

  it('host-left-paused: the one who paused left → "Bấm Tiếp tục để chạy lại" for the new Host', () => {
    const v = input(
      { ...paused, host_id: '1', last_action: { by: '2', action: 'pause' } },
      { seated: new Set(['1', '3']) },
    );
    expect(cycleLines(v)).toEqual([{ key: 'pressResume' }]);
  });

  it('a cycle edit while paused does not rename who paused', () => {
    const v = input({
      ...paused,
      host_id: '2',
      last_action: { by: '3', action: 'config' },
    });
    expect(cycleLines(v)[0]).toEqual({ key: 'pausedBy', userId: '2' });
  });

  it('host-transferred: "Bình đã rời phòng" under the count', () => {
    expect(subLine(input({}, { hostLeft: '2' }))).toEqual({
      key: 'hostLeft',
      userId: '2',
    });
  });

  it('S-ROOM-04 "Bỏ qua pha" lands on the next phase', () => {
    expect(nextPhaseOf(input().timer)).toBe('short_break');
    const brk = input({
      phase: 'short_break',
      phase_ends_at: '2026-10-18T15:11:00.000Z',
    });
    expect(nextPhaseOf(brk.timer)).toBe('focus');
  });
});

describe('pause line after a cycle edit', () => {
  it('names who paused from memory when the last action was the edit', () => {
    const v = input(
      {
        status: 'paused',
        phase_ends_at: null,
        paused_remaining_ms: 600_000,
        host_id: '2',
        last_action: { by: '1', action: 'config' },
      },
      { pausedBy: '1' },
    );
    expect(cycleLines(v)[0]).toEqual({ key: 'pausedByMe' });
  });
});
