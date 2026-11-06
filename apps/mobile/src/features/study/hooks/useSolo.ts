import type { CycleConfig, SoloAction } from '@nezfocus/shared';
import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { create } from 'zustand';
import { ApiError } from '../../../data/api';
import { soloMemory, soloRepository } from '../../../data/study';
import { sessionStore } from '../../../domain/session/sessionStore';
import {
  applyLocally,
  receiveSoloEvent,
  restoreSolo,
  snapshotOf,
  timerOf,
  type SoloSnapshot,
} from '../../../domain/study/solo';
import { useGatewayEvent } from '../../gateway/hooks/useGatewayEvent';

const SOLO = ['solo'] as const;

// The send time lets the clock offset use the middle of the round trip.
const timed = async <R>(call: () => Promise<R>) => {
  const sent = Date.now();
  return { r: await call(), sent };
};

const read = (qc: QueryClient) =>
  qc.getQueryData<SoloSnapshot | null>(SOLO) ?? null;

// One cached datum for the screen, MiniPlayer and the tab badge (SRS 7.3.1: backend data in TanStack Query).
export function useSolo() {
  const qc = useQueryClient();
  const signedIn = useStore(sessionStore, (s) => s.status === 'signed-in');
  return (
    useQuery({
      queryKey: SOLO,
      queryFn: () =>
        restoreSolo(soloRepository, soloMemory, read(qc), Date.now),
      enabled: signedIn,
    }).data ?? null
  );
}

// Mounted once under the tabs: Gateway updates, and asking the backend when a phase runs out locally.
export function useSoloSync() {
  const qc = useQueryClient();
  const snap = useSolo();
  useGatewayEvent('SOLO_SESSION_UPDATE', (d) => {
    qc.setQueryData<SoloSnapshot | null>(SOLO, (prev) =>
      receiveSoloEvent(prev ?? null, d, Date.now()),
    );
    if (d.solo_session.status !== 'ended')
      void soloMemory.remember(d.solo_session.id);
  });

  useEffect(() => {
    const timer = snap && timerOf(snap, new Date());
    if (!timer || timer.status === 'paused') return;
    // The backend moves the phase on read; the small delay lets its own job win the race.
    const id = setTimeout(
      () => void qc.invalidateQueries({ queryKey: SOLO }),
      timer.remainingMs + 500,
    );
    return () => clearTimeout(id);
  }, [qc, snap]);
}

export function useStartSolo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cycle: CycleConfig) =>
      timed(() => soloRepository.start(cycle)),
    onSuccess: async ({ r, sent }) => {
      qc.setQueryData(
        SOLO,
        snapshotOf(r, { sent, received: Date.now() }, false, read(qc)),
      );
      await soloMemory.remember(r.solo_session.id);
    },
    // 40903: already running here or on another device; show that one.
    onError: () => qc.invalidateQueries({ queryKey: SOLO }),
  });
}

// Paused while offline and resent on reconnect (TanStack onlineManager); the backend replays an
// action that already took effect as 200 (CR-28 #15), so a resend is safe.
export function useSoloAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: SoloAction }) =>
      timed(() => soloRepository.act(id, action)),
    onMutate: async ({ action }) => {
      await qc.cancelQueries({ queryKey: SOLO });
      const prev = read(qc);
      // Online the answer comes back in a moment and is the truth; showing a local guess first made
      // pause / resume jump by a second when the answer replaced it. Offline the guess is all we have.
      if (!prev) return;
      // Our own stop's Gateway echo can beat the HTTP answer; it must not read as another device.
      if (action.action === 'stop')
        qc.setQueryData<SoloSnapshot>(SOLO, { ...prev, stoppedHere: true });
      if (onlineManager.isOnline()) return;
      const now = new Date(Date.now() + prev.offsetMs);
      const local = applyLocally(prev.session, action, now);
      if (local)
        qc.setQueryData<SoloSnapshot>(SOLO, {
          ...prev,
          session: local,
          stoppedHere: action.action === 'stop' || prev.stoppedHere,
        });
    },
    onSuccess: async ({ r, sent }, { action }) => {
      const prev = read(qc);
      const stoppedHere = action.action === 'stop' || !!prev?.stoppedHere;
      qc.setQueryData(
        SOLO,
        snapshotOf(r, { sent, received: Date.now() }, stoppedHere, prev),
      );
      if (action.action === 'stop') await soloMemory.forget();
    },
    onError: (e) => {
      if (e instanceof ApiError) void qc.invalidateQueries({ queryKey: SOLO });
    },
  });
}

// "Xong" / leaving an ending: the session is seen, forget it.
export function useCloseSolo() {
  const qc = useQueryClient();
  return () => {
    qc.setQueryData(SOLO, null);
    void soloMemory.forget();
  };
}

// Re-renders every `ms`. Countdowns use 250: their digits turn on the backend's second, not the
// phone's, so a 1 s tick could show a value up to a second stale (and freeze that on pause).
export function useNow(ms = 250) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      id = setTimeout(tick, ms - (Date.now() % ms));
    };
    id = setTimeout(tick, ms - (Date.now() % ms));
    return () => clearTimeout(id);
  }, [ms]);
  return now;
}

// ponytail: the last cycle lives in memory until S-STUDY-01 (P1-B3.4, #87) stores it on the device.
export const useLastCycle = create<{
  cycle: CycleConfig;
  set: (cycle: CycleConfig) => void;
}>((set) => ({
  cycle: { focus_min: 25, short_break_min: 5 },
  set: (cycle) => set({ cycle }),
}));
