import type { CycleConfig, SoloAction } from '@nezfocus/shared';
import {
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
    mutationFn: (cycle: CycleConfig) => soloRepository.start(cycle),
    onSuccess: async (r) => {
      qc.setQueryData(SOLO, snapshotOf(r, Date.now()));
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
      soloRepository.act(id, action),
    onMutate: async ({ action }) => {
      await qc.cancelQueries({ queryKey: SOLO });
      const prev = read(qc);
      if (!prev) return;
      const now = new Date(Date.now() + prev.offsetMs);
      const local = applyLocally(prev.session, action, now);
      if (local)
        qc.setQueryData<SoloSnapshot>(SOLO, {
          ...prev,
          session: local,
          stoppedHere: action.action === 'stop' || prev.stoppedHere,
        });
    },
    onSuccess: async (r, { action }) => {
      const stoppedHere = action.action === 'stop' || !!read(qc)?.stoppedHere;
      qc.setQueryData(SOLO, snapshotOf(r, Date.now(), stoppedHere));
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

// Re-renders every `ms`, on the second boundary so a countdown never skips a digit.
export function useNow(ms = 1000) {
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
