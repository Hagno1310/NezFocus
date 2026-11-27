import {
  roomTimer,
  type FocusPhase,
  type FocusSessionAction,
  type FocusSessionState,
  type StartFocusSessionRequest,
} from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';
import { ApiError } from '../../../data/api/client';
import { roomSessionRepository } from '../../../data/study';
import {
  acceptRoomSession,
  roomSessionsStore,
} from '../../../domain/study/roomSessions';
import { roomListLabel } from '../format';
import { useNow } from './useSolo';

// CR-28 #38: the running Room Session of a channel (null: none) and my summary of the last one.
export function useRoomSessionOf(channelId: string) {
  const session = useStore(
    roomSessionsStore,
    (s) => s.byChannel[channelId] ?? null,
  );
  const summary = useStore(
    roomSessionsStore,
    (s) => s.ended[channelId] ?? null,
  );
  const offsetMs = useStore(roomSessionsStore, (s) => s.offsetMs);
  return { session, summary, offsetMs };
}

// The session's copy may come over the Gateway a moment after the 40903 answer.
const SESSION_WAIT_MS = 3000;
function sessionSoon(channelId: string) {
  return new Promise<FocusSessionState | null>((resolve) => {
    const now = roomSessionsStore.getState().byChannel[channelId];
    if (now) return resolve(now);
    const stop = roomSessionsStore.subscribe((s) => {
      const f = s.byChannel[channelId];
      if (!f) return;
      clearTimeout(timer);
      stop();
      resolve(f);
    });
    const timer = setTimeout(() => {
      stop();
      resolve(null);
    }, SESSION_WAIT_MS);
  });
}

// S-ROOM-03: Start for the room; 40903 = someone started first (`conflict`).
export function useStartRoomSession(
  channelId: string,
  onConflict: (session: FocusSessionState | null) => void,
) {
  return useMutation({
    mutationFn: async (body: StartFocusSessionRequest) => {
      const sent = Date.now();
      const r = await roomSessionRepository.start(channelId, body);
      return { r, sent };
    },
    onSuccess: ({ r, sent }) =>
      acceptRoomSession(r.focus_session, r.backend_time, {
        sent,
        received: Date.now(),
      }),
    onError: async (e) => {
      if (e instanceof ApiError && e.code === 40903)
        onConflict(await sessionSoon(channelId));
    },
  });
}

// Whether the app is in the foreground: the phase motion only plays there.
export function useActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) =>
      setActive(s === 'active'),
    );
    return () => sub.remove();
  }, []);
  return active;
}

export type RoomLine = {
  phase: FocusPhase;
  state: 'running' | 'paused';
  label: string;
};

// C-05 `focus-running`: the phase line of every room with a session, by channel id.
export function useRoomLines(): (channelId: string) => RoomLine | null {
  const { t } = useTranslation();
  const byChannel = useStore(roomSessionsStore, (s) => s.byChannel);
  const offsetMs = useStore(roomSessionsStore, (s) => s.offsetMs);
  const now = useNow(1000).getTime();
  return (channelId) => {
    const f = byChannel[channelId];
    if (!f) return null;
    const timer = roomTimer(f, offsetMs, now);
    return {
      phase: timer.phase,
      state: timer.status === 'paused' ? 'paused' : 'running',
      label: roomListLabel(t, timer),
    };
  };
}

// STUDY-11 over REST (S-ROOM-02 Tạm dừng / Tiếp tục, S-ROOM-04, S-ROOM-05 `stop`); `stop` answers
// 204 and the END comes over the Gateway.
export function useRoomAction() {
  return useMutation({
    mutationFn: async (v: { id: string; action: FocusSessionAction }) => {
      const sent = Date.now();
      const r = await roomSessionRepository.act(v.id, v.action);
      return { r, sent };
    },
    onSuccess: ({ r, sent }) => {
      if (r)
        acceptRoomSession(r.focus_session, r.backend_time, {
          sent,
          received: Date.now(),
        });
    },
  });
}
