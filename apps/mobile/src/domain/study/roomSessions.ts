import {
  clockOffsetMs,
  myFocusedSeconds,
  type DispatchEvent,
  type FocusSessionEnd,
  type FocusSessionState,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';

// CR-28 #38: every running Room Session of the rooms I can view, by channel, from READY and
// FOCUS_SESSION_*; `ended` keeps my summary until the room has a new session or I leave it.
export type RoomSessions = {
  byChannel: Readonly<Record<string, FocusSessionState>>;
  ended: Readonly<Record<string, FocusSessionEnd>>;
  offsetMs: number;
};

export const emptyRoomSessions: RoomSessions = {
  byChannel: {},
  ended: {},
  offsetMs: 0,
};

// Network delay wobbles each measured offset; only a change this big replaces it (as Solo).
const OFFSET_JITTER_MS = 1000;

const steady = (prev: number, measured: number) =>
  Math.abs(measured - prev) < OFFSET_JITTER_MS ? prev : measured;

const without = <T>(map: Readonly<Record<string, T>>, key: string) => {
  const { [key]: _, ...rest } = map;
  return rest;
};

// `receivedAt`: the phone clock when the event arrived (SRS 7.3.6 step 1).
export function reduceRoomSessions(
  s: RoomSessions,
  event: DispatchEvent,
  receivedAt: number,
): RoomSessions {
  switch (event.t) {
    case 'READY':
      return {
        byChannel: Object.fromEntries(
          event.d.focus_sessions.map((f) => [f.channel_id, f]),
        ),
        ended: {},
        offsetMs: clockOffsetMs(event.d.backend_time, { received: receivedAt }),
      };
    case 'FOCUS_SESSION_START':
    case 'FOCUS_SESSION_UPDATE': {
      const f = event.d.focus_session;
      return {
        byChannel: { ...s.byChannel, [f.channel_id]: f },
        ended:
          event.t === 'FOCUS_SESSION_START'
            ? without(s.ended, f.channel_id)
            : s.ended,
        offsetMs: steady(
          s.offsetMs,
          clockOffsetMs(event.d.backend_time, { received: receivedAt }),
        ),
      };
    }
    case 'FOCUS_SESSION_END': {
      const e = event.d;
      return {
        ...s,
        byChannel: without(s.byChannel, e.channel_id),
        ended:
          e.focused_seconds === null
            ? without(s.ended, e.channel_id)
            : { ...s.ended, [e.channel_id]: e },
      };
    }
    default:
      return s;
  }
}

export const roomSessionsStore = createStore<RoomSessions>(
  () => emptyRoomSessions,
);

// A start answered over REST, before (or instead of) its Gateway copy.
export function acceptRoomSession(
  f: FocusSessionState,
  backendTime: string,
  timing: { sent: number; received: number },
) {
  roomSessionsStore.setState((s) => ({
    byChannel: { ...s.byChannel, [f.channel_id]: f },
    ended: without(s.ended, f.channel_id),
    offsetMs: steady(s.offsetMs, clockOffsetMs(backendTime, timing)),
  }));
}

// S-ROOM-06 / S-ROOM-03 `solo-confirm`: I end my Solo myself, so no `solo-stopped-by-room-start`
// Toast when its `joined_room` end comes.
const SOLO_END_WINDOW_MS = 15_000;
let soloEndAt = 0;
export const expectSoloEnd = () => {
  soloEndAt = Date.now();
};
export const soloEndExpected = () =>
  Date.now() - soloEndAt < SOLO_END_WINDOW_MS;

// S-ROOM-EDGE › sheet tổng kết: "Ở lại phòng" or leaving the room closes it.
export const dropSummary = (channelId: string) =>
  roomSessionsStore.setState((s) => ({
    ended: without(s.ended, channelId),
  }));

// S-ROOM-02 dòng phụ: today's credited minutes plus my stretch still counting in this session.
export function todayMinutesNow(
  creditedToday: number,
  session: FocusSessionState | null,
  offsetMs: number,
  localNow: number,
): number {
  const me = session?.me;
  if (!session || !me) return creditedToday;
  const live = myFocusedSeconds(session, offsetMs, localNow) ?? 0;
  return creditedToday + Math.floor((live - me.focused_seconds) / 60);
}
