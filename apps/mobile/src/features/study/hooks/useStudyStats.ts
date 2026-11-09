import {
  periodOf,
  type StatsView,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { studyStatsRepository } from '../../../data/study';
import { timerOf } from '../../../domain/study/solo';
import {
  liveFocusSeconds,
  msUntilMidnight,
  withLiveFocus,
} from '../../../domain/study/stats';
import { useGatewayEvent } from '../../gateway/hooks/useGatewayEvent';
import { useNow, useSolo } from './useSolo';

const STATS = 'study-stats';
const SESSIONS = 'study-sessions';

// Focus already credited by a pause in the running phase (DEC-24), so it is not counted twice.
// ponytail: only pauses this phone saw, so a restart after pause + resume overcounts until the phase ends; exact once the Solo contract carries the credited seconds of the phase.
const creditedInPhase = new Map<string, number>();

// The running Solo focus not yet credited by the backend; a 10 s tick keeps the minute close.
export function useLiveFocusSeconds() {
  const snap = useSolo();
  const now = useNow(10_000);
  if (!snap) return 0;
  const s = snap.session;
  const key = `${s.id}:${s.focus_phases_done}`;
  const timer = timerOf(snap, now);
  if (timer?.status === 'paused' && timer.phase === 'focus')
    creditedInPhase.set(key, timer.totalMs - timer.remainingMs);
  return liveFocusSeconds(timer, creditedInPhase.get(key) ?? 0);
}

// date omitted = the period holding today, as the backend sees it.
export function useStudyStats(view: StatsView, date?: string) {
  const live = useLiveFocusSeconds();
  const q = useQuery({
    queryKey: [STATS, view, date ?? 'today'],
    queryFn: () => studyStatsRepository.stats({ view, date }),
    placeholderData: keepPreviousData,
    // SRS 7.3.2: a period once loaded stays readable offline.
    // ponytail: in memory only, lost on restart; persist the cache once op-sqlite lands (P2-A3.3 #101).
    gcTime: Infinity,
  });
  const qc = useQueryClient();
  const timeZone = q.data?.timezone;
  // Past the user's midnight, today's progress and the streak start over (S-STUDY-03 › Qua nửa đêm).
  useEffect(() => {
    if (!timeZone) return;
    const id = setTimeout(
      () => void qc.invalidateQueries({ queryKey: [STATS] }),
      msUntilMidnight(new Date(), timeZone) + 1000,
    );
    return () => clearTimeout(id);
  }, [qc, timeZone, q.dataUpdatedAt]);
  const data: StudyStatsResponse | undefined =
    q.data && withLiveFocus(q.data, live);
  return { ...q, data };
}

// S-STUDY-03 › Lịch sử: 20 rows a page, the next page from next_cursor.
export function useSessionHistory(view: StatsView, date: string | undefined) {
  const p = date ? periodOf(view, date) : null;
  return useInfiniteQuery({
    queryKey: [SESSIONS, p?.from, p?.to],
    queryFn: ({ pageParam }) =>
      studyStatsRepository.sessions({
        from: p!.from,
        to: p!.to,
        before: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: !!p,
    gcTime: Infinity,
  });
}

// Mounted once under the tabs. REQ-STUDY-03: STREAK_UPDATE after each credit, to every session.
export function useStudyStatsSync() {
  const qc = useQueryClient();
  useGatewayEvent('STREAK_UPDATE', (d) => {
    qc.setQueriesData<StudyStatsResponse>(
      { queryKey: [STATS] },
      (prev) => prev && { ...prev, ...d },
    );
    void qc.invalidateQueries({ queryKey: [STATS] });
    void qc.invalidateQueries({ queryKey: [SESSIONS] });
  });
}

export function useRefreshStudy() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: [STATS] }),
      qc.invalidateQueries({ queryKey: [SESSIONS] }),
    ]);
}
