import { roomTimer, type FocusSessionState } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  countLine,
  cycleLines,
  roleChip,
  roomControls,
  subLine,
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
