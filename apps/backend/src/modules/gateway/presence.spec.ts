import type { SoloSession } from '@nezfocus/shared';
import {
  aggregate,
  BACKGROUND_IDLE_MS,
  LIVE_WINDOW_MS,
  soloActivity,
  visibleActivity,
  type Device,
} from './presence.js';

const NOW = 1_000_000_000;
const device = (over: Partial<Device> = {}): Device => ({
  lastSeenAt: NOW,
  connected: true,
  foreground: true,
  afk: false,
  backgroundSince: null,
  ...over,
});

describe('aggregate (REQ-AUTH-05)', () => {
  it('online when at least one device is active, across devices', () => {
    expect(aggregate('online', [device({ afk: true }), device()], NOW)).toBe(
      'online',
    );
  });

  it('AC1: idle when every device is afk (10 minutes without a touch)', () => {
    expect(aggregate('online', [device({ afk: true })], NOW)).toBe('idle');
  });

  it('AC1: idle after 5 minutes in the background with the socket alive (DEC-34)', () => {
    const bg = (ms: number) =>
      device({ foreground: false, backgroundSince: NOW - ms });
    expect(aggregate('online', [bg(BACKGROUND_IDLE_MS - 1)], NOW)).toBe(
      'online',
    );
    expect(aggregate('online', [bg(BACKGROUND_IDLE_MS)], NOW)).toBe('idle');
  });

  it('AC2: Invisible shows offline to others', () => {
    expect(aggregate('invisible', [device()], NOW)).toBe('offline');
  });

  it('dnd and a manual idle show as chosen while connected (dnd is display only, v1.7)', () => {
    expect(aggregate('dnd', [device({ afk: true })], NOW)).toBe('dnd');
    expect(aggregate('idle', [device()], NOW)).toBe('idle');
  });

  it('AC3: offline when no device is connected, or none was heard from in the live window', () => {
    expect(aggregate('online', [], NOW)).toBe('offline');
    expect(aggregate('online', [device({ connected: false })], NOW)).toBe(
      'offline',
    );
    expect(
      aggregate(
        'online',
        [device({ lastSeenAt: NOW - LIVE_WINDOW_MS - 1 })],
        NOW,
      ),
    ).toBe('offline');
    expect(
      aggregate('online', [device({ lastSeenAt: NOW - LIVE_WINDOW_MS })], NOW),
    ).toBe('online');
  });
});

const solo = (over: Partial<SoloSession> = {}): SoloSession => ({
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
  ...over,
});

describe('solo activity (CR-24)', () => {
  it('carries the phase and its end while running', () => {
    expect(soloActivity(solo())).toEqual({
      kind: 'solo',
      phase: 'focus',
      state: 'running',
      phase_ends_at: '2026-10-18T15:21:00.000Z',
    });
  });

  it('paused and waiting have no end; an ended session is no activity', () => {
    expect(
      soloActivity(
        solo({
          status: 'paused',
          phase_ends_at: null,
          paused_remaining_ms: 60_000,
        }),
      ),
    ).toMatchObject({ state: 'paused', phase_ends_at: null });
    expect(soloActivity(solo({ status: 'ended' }))).toBeNull();
    expect(soloActivity(null)).toBeNull();
  });
});

describe('who sees the activity (AUTH-05 AC5, the parts in this ticket)', () => {
  const a = soloActivity(solo());
  it('hidden when Invisible, offline or show_study_activity is off', () => {
    expect(visibleActivity(a, { status: 'online', showActivity: true })).toBe(
      a,
    );
    expect(
      visibleActivity(a, { status: 'offline', showActivity: true }),
    ).toBeNull();
    expect(
      visibleActivity(a, { status: 'online', showActivity: false }),
    ).toBeNull();
  });
});
