import { DispatchEvents, parseDispatch } from '../gateway/events.contract.js';
import {
  FocusSessionAction,
  FocusSessionRoutes,
  StartFocusSessionRequest,
  type FocusSessionEnd,
  type FocusSessionResponse,
} from './room-session.contract.js';

const state: FocusSessionResponse = {
  focus_session: {
    id: '10',
    channel_id: '20',
    server_id: '30',
    status: 'running',
    phase: 'focus',
    cycle_config: { focus_min: 25, short_break_min: 5 },
    next_cycle_config: null,
    focus_phases_done: 1,
    phase_ends_at: '2026-10-18T15:06:00.000Z',
    paused_remaining_ms: null,
    host_id: '40',
    started_at: '2026-10-18T14:11:00.000Z',
    last_action: { by: '41', action: 'resume' },
    me: { focused_seconds: 1500, counting_since: '2026-10-18T14:41:00.000Z' },
  },
  backend_time: '2026-10-18T14:47:00.000Z',
};

describe('Room Session contract (REQ-STUDY-01, STUDY-11, CR-28 #38)', () => {
  it('routes', () => {
    expect(FocusSessionRoutes.start('20')).toBe('/channels/20/focus-session');
    expect(FocusSessionRoutes.byId('10')).toBe('/focus-sessions/10');
  });

  it('STUDY-01 AC6: Start with focus 200 minutes is invalid', () => {
    expect(
      StartFocusSessionRequest.safeParse({
        cycle_config: { focus_min: 200, short_break_min: 5 },
      }).success,
    ).toBe(false);
  });

  it('STUDY-10 AC8: Start may carry end_solo', () => {
    const body = {
      cycle_config: { focus_min: 25, short_break_min: 5 },
      end_solo: true,
    };
    expect(StartFocusSessionRequest.parse(body)).toEqual(body);
  });

  it('config needs a cycle; other actions take none; continue is Solo only', () => {
    expect(FocusSessionAction.safeParse({ action: 'config' }).success).toBe(
      false,
    );
    expect(FocusSessionAction.parse({ action: 'skip' })).toEqual({
      action: 'skip',
    });
    expect(FocusSessionAction.safeParse({ action: 'continue' }).success).toBe(
      false,
    );
  });

  it('FOCUS_SESSION_START / UPDATE carry the state with the receiver’s own `me`', () => {
    for (const t of ['FOCUS_SESSION_START', 'FOCUS_SESSION_UPDATE'] as const)
      expect(parseDispatch({ op: 0, s: 1, t, d: state })).toEqual({
        t,
        s: 1,
        d: state,
      });
    const notIn = {
      ...state,
      focus_session: { ...state.focus_session, me: null, last_action: null },
    };
    expect(DispatchEvents.FOCUS_SESSION_UPDATE.parse(notIn)).toEqual(notIn);
  });

  it('FOCUS_SESSION_END: ended_by null when it ended by itself; focused_seconds null for who never took part', () => {
    const end: FocusSessionEnd = {
      id: '10',
      channel_id: '20',
      server_id: '30',
      ended_at: '2026-10-18T15:15:00.000Z',
      end_reason: 'empty_channel',
      ended_by: null,
      focused_seconds: null,
    };
    expect(DispatchEvents.FOCUS_SESSION_END.parse(end)).toEqual(end);
    expect(
      DispatchEvents.FOCUS_SESSION_END.safeParse({
        ...end,
        end_reason: 'empty',
      }).success,
    ).toBe(false);
  });
});
