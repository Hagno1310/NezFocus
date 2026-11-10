import { describe, expect, it } from 'vitest';
import { ClientFrame, GatewayOp } from '../gateway/gateway.contract.js';
import { parseDispatch } from '../gateway/events.contract.js';
import {
  activityBlock,
  activityIcon,
  activityLine,
  activityText,
} from './activity-text.js';
import {
  PresenceEvent,
  PresenceUpdate,
  type StudyActivity,
} from './presence.contract.js';

const NOW = new Date('2026-10-18T14:47:00Z'); // 21:47 GMT+7
const inMin = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();

describe('op 3 PRESENCE_UPDATE (REQ-AUTH-05)', () => {
  it('carries the manual status and the afk flag, afk off by default', () => {
    expect(PresenceUpdate.parse({ status: 'dnd' })).toEqual({
      status: 'dnd',
      afk: false,
    });
    const f = ClientFrame.parse({
      op: GatewayOp.PRESENCE_UPDATE,
      d: { status: 'online', afk: true },
    });
    expect(f.d).toEqual({ status: 'online', afk: true });
  });

  it('rejects an unknown status, and offline (only others see offline)', () => {
    expect(PresenceUpdate.safeParse({ status: 'busy' }).success).toBe(false);
    expect(PresenceUpdate.safeParse({ status: 'offline' }).success).toBe(false);
  });
});

describe('DISPATCH PRESENCE_UPDATE', () => {
  const solo = {
    user_id: '42',
    status: 'online',
    activity: {
      kind: 'solo',
      phase: 'focus',
      state: 'running',
      phase_ends_at: inMin(12),
    },
  };

  it('parses through parseDispatch', () => {
    const e = parseDispatch({ op: 0, t: 'PRESENCE_UPDATE', s: 3, d: solo });
    expect(e?.t).toBe('PRESENCE_UPDATE');
  });

  it('invisible is never sent to others: the visible status has offline, not invisible', () => {
    expect(
      PresenceEvent.safeParse({ ...solo, status: 'offline', activity: null })
        .success,
    ).toBe(true);
    expect(
      PresenceEvent.safeParse({ ...solo, status: 'invisible' }).success,
    ).toBe(false);
  });

  it('AC4: group_study without the room carries no name, phase or end time', () => {
    const hidden = PresenceEvent.parse({
      user_id: '42',
      status: 'online',
      activity: { kind: 'group_study', room: null },
    });
    expect(hidden.activity).toEqual({ kind: 'group_study', room: null });
  });
});

describe('READY presence', () => {
  it('has my chosen status and the presences of related people', () => {
    const e = parseDispatch({
      op: 0,
      t: 'READY',
      s: 1,
      d: {
        session_id: '1',
        user: {
          id: '1',
          email: 'an@example.com',
          username: 'an',
          display_name: 'An',
          account_completed: true,
          created_at: NOW.toISOString(),
        },
        servers: [],
        preferred_status: 'invisible',
        presences: [{ user_id: '2', status: 'idle', activity: null }],
      },
    });
    expect(e?.t === 'READY' && e.d.preferred_status).toBe('invisible');
  });
});

const text = (a: StudyActivity, form: 'short' | 'full') =>
  activityLine(activityText(a, form, NOW));

describe('activity text (REQ-AUTH-05 CR-24/25, C-40)', () => {
  const solo = (
    state: 'running' | 'paused' | 'waiting',
    phase: 'focus' | 'short_break' | 'long_break' = 'focus',
    minutes = 12,
  ): StudyActivity => ({
    kind: 'solo',
    phase,
    state,
    phase_ends_at: state === 'running' ? inMin(minutes) : null,
  });

  it('solo, focus: full and short', () => {
    expect(text(solo('running'), 'full')).toBe(
      'Đang học một mình · Tập trung · còn 12 phút',
    );
    expect(text(solo('running', 'focus', 105), 'short')).toBe(
      'Một mình · còn 105 phút',
    );
  });

  it('solo, breaks', () => {
    expect(text(solo('running', 'short_break', 4), 'full')).toBe(
      'Đang học một mình · Nghỉ ngắn · còn 4 phút',
    );
    expect(text(solo('running', 'long_break', 12), 'short')).toBe(
      'Một mình · còn 12 phút',
    );
  });

  it('solo, waiting and paused (chốt 10/11/2026)', () => {
    expect(text(solo('waiting', 'short_break'), 'full')).toBe(
      'Đang học một mình · Hết giờ nghỉ',
    );
    expect(text(solo('waiting', 'short_break'), 'short')).toBe(
      'Một mình · hết giờ nghỉ',
    );
    expect(text(solo('paused'), 'short')).toBe('Tạm dừng');
    expect(text(solo('paused'), 'full')).toBe('Đang học một mình · Tạm dừng');
  });

  it('"còn N phút" counts whole minutes; under one minute reads "còn dưới 1 phút"', () => {
    expect(text(solo('running', 'focus', 12.9), 'short')).toBe(
      'Một mình · còn 12 phút',
    );
    expect(text(solo('running', 'focus', 0.5), 'short')).toBe(
      'Một mình · còn dưới 1 phút',
    );
  });

  it('only "còn N phút" never shrinks; the phase, "Một mình" and the room cut first', () => {
    expect(activityText(solo('running'), 'short', NOW)).toEqual([
      { text: 'Một mình', shrink: true },
      { text: 'còn 12 phút', shrink: false },
    ]);
  });

  const room = {
    channel_id: '9',
    channel_name: 'Phòng học im lặng',
    phase: 'focus' as const,
    state: 'running' as const,
    phase_ends_at: inMin(18),
  };

  it('group_study: room seen, paused, and not seen ("Đang học cùng nhóm")', () => {
    const seen: StudyActivity = { kind: 'group_study', room };
    expect(text(seen, 'short')).toBe('Tập trung · còn 18 phút');
    expect(text(seen, 'full')).toBe(
      'Tập trung · còn 18 phút · Phòng học im lặng',
    );
    const paused: StudyActivity = {
      kind: 'group_study',
      room: { ...room, state: 'paused', phase_ends_at: null },
    };
    expect(text(paused, 'short')).toBe('Tạm dừng');
    expect(text(paused, 'full')).toBe('Tạm dừng · Phòng học im lặng');
    const hidden: StudyActivity = { kind: 'group_study', room: null };
    expect(text(hidden, 'short')).toBe('Đang học cùng nhóm');
    expect(text(hidden, 'full')).toBe('Đang học cùng nhóm');
  });

  it('voice: room without a session, and not seen', () => {
    const seen: StudyActivity = {
      kind: 'voice',
      room: {
        channel_id: '9',
        channel_name: 'Phòng thảo luận nhóm',
        study_room: true,
      },
    };
    expect(text(seen, 'short')).toBe('Đang ở Phòng thảo luận nhóm');
    expect(text({ kind: 'voice', room: null }, 'full')).toBe(
      'Đang ở một phòng voice',
    );
  });
});

describe('block form (C-40 › block, S-HOME-10)', () => {
  const solo: StudyActivity = {
    kind: 'solo',
    phase: 'focus',
    state: 'running',
    phase_ends_at: inMin(12),
  };
  const room = {
    channel_id: '9',
    channel_name: 'Phòng học im lặng',
    phase: 'focus' as const,
    state: 'running' as const,
    phase_ends_at: inMin(18),
  };

  it('line 1 phase + time, line 2 the room or "Đang học một mình"', () => {
    const b = activityBlock(solo, NOW);
    expect(activityLine(b.title)).toBe('Tập trung · còn 12 phút');
    expect(b.subtitle).toBe('Đang học một mình');
    const g = activityBlock({ kind: 'group_study', room }, NOW);
    expect(activityLine(g.title)).toBe('Tập trung · còn 18 phút');
    expect(g.subtitle).toBe('Phòng học im lặng');
  });

  it('a room not seen has no second line', () => {
    const b = activityBlock({ kind: 'group_study', room: null }, NOW);
    expect(activityLine(b.title)).toBe('Đang học cùng nhóm');
    expect(b.subtitle).toBeNull();
  });
});

describe('activity icon (C-40 › Icon 14)', () => {
  it('phase icon while running; pause, coffee, lamp-desk, volume-2 otherwise', () => {
    const at = { phase_ends_at: inMin(5) };
    expect(
      activityIcon({
        kind: 'solo',
        phase: 'short_break',
        state: 'running',
        ...at,
      }),
    ).toBe('short_break');
    expect(
      activityIcon({
        kind: 'solo',
        phase: 'focus',
        state: 'paused',
        phase_ends_at: null,
      }),
    ).toBe('paused');
    expect(
      activityIcon({
        kind: 'solo',
        phase: 'short_break',
        state: 'waiting',
        phase_ends_at: null,
      }),
    ).toBe('waiting');
    expect(activityIcon({ kind: 'group_study', room: null })).toBe(
      'study_room',
    );
    expect(activityIcon({ kind: 'voice', room: null })).toBe('voice');
    expect(
      activityIcon({
        kind: 'voice',
        room: {
          channel_id: '9',
          channel_name: 'Phòng thảo luận nhóm',
          study_room: true,
        },
      }),
    ).toBe('study_room');
  });
});

describe('a running activity without an end time', () => {
  it('shows no time rather than a wrong one', () => {
    const a: StudyActivity = {
      kind: 'solo',
      phase: 'focus',
      state: 'running',
      phase_ends_at: null,
    };
    expect(text(a, 'short')).toBe('Một mình');
  });
});
