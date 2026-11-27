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
  // When each room's last session ended, for everyone (S-STUDY-EDGE `room-ended-on-join`).
  endedAt: Readonly<Record<string, string>>;
  // Who paused each paused session: `last_action` only keeps the latest (a cycle edit after it).
  pausedBy: Readonly<Record<string, string>>;
  offsetMs: number;
};

export const emptyRoomSessions: RoomSessions = {
  byChannel: {},
  ended: {},
  endedAt: {},
  pausedBy: {},
  offsetMs: 0,
};

// Any delay (network, a busy JS thread) only makes a reading smaller than the truth, so the
// biggest reading is the best; one far below it means the phone's clock was changed.
const CLOCK_CHANGED_MS = 60_000;

const steady = (prev: number, measured: number) =>
  measured > prev || prev - measured > CLOCK_CHANGED_MS ? measured : prev;

const without = <T>(map: Readonly<Record<string, T>>, key: string) => {
  const { [key]: _, ...rest } = map;
  return rest;
};

const pauserOf = (
  map: Readonly<Record<string, string>>,
  f: FocusSessionState,
): Readonly<Record<string, string>> =>
  f.status !== 'paused'
    ? without(map, f.id)
    : f.last_action?.action === 'pause'
      ? { ...map, [f.id]: f.last_action.by }
      : map;

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
        endedAt: {},
        pausedBy: Object.fromEntries(
          event.d.focus_sessions
            .filter((f) => f.last_action?.action === 'pause')
            .map((f) => [f.id, f.last_action!.by]),
        ),
        offsetMs: clockOffsetMs(event.d.backend_time, { received: receivedAt }),
      };
    case 'FOCUS_SESSION_START':
    case 'FOCUS_SESSION_UPDATE': {
      const f = event.d.focus_session;
      return {
        ...s,
        byChannel: { ...s.byChannel, [f.channel_id]: f },
        pausedBy: pauserOf(s.pausedBy, f),
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
        endedAt: { ...s.endedAt, [e.channel_id]: e.ended_at },
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
    ...s,
    byChannel: { ...s.byChannel, [f.channel_id]: f },
    pausedBy: pauserOf(s.pausedBy, f),
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
