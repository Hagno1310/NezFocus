import {
  SoloRoutes,
  StudySessionsResponse,
  StudyStatsResponse,
  StudyStatsRoutes,
  CycleConfig,
} from '@nezfocus/shared';
import * as SecureStore from 'expo-secure-store';
import type { SoloMemory, SoloRepository } from '../../domain/study/solo';
import type { StudyStatsRepository } from '../../domain/study/stats';
import { api } from '../api';
import { pickRepository } from '../fake';
import { fakeStudyStatsRepository } from './FakeStudyStatsRepository';

export const soloRepository: SoloRepository = {
  start: (cycle_config) =>
    api.request(SoloRoutes.start, { method: 'POST', body: { cycle_config } }),
  current: () => api.request(SoloRoutes.current),
  get: (id) => api.request(SoloRoutes.byId(id)),
  act: (id, action) =>
    api.request(SoloRoutes.byId(id), { method: 'PATCH', body: action }),
};

// ponytail: khi op-sqlite lands (P2-A3.3 #101): move these keys there. SecureStore is the only
// key-value store installed now.
const KEY = 'solo.last-id';
const STOPPED_KEY = 'solo.stopped-here';

export const soloMemory: SoloMemory = {
  lastId: () => SecureStore.getItemAsync(KEY),
  remember: (id) => SecureStore.setItemAsync(KEY, id),
  forget: async () => {
    await SecureStore.deleteItemAsync(KEY);
    await SecureStore.deleteItemAsync(STOPPED_KEY);
  },
  stoppedHere: () => SecureStore.getItemAsync(STOPPED_KEY),
  markStoppedHere: (id) => SecureStore.setItemAsync(STOPPED_KEY, id),
};

const query = (q: Record<string, string | number | undefined>) => {
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

const remoteStudyStatsRepository: StudyStatsRepository = {
  stats: async (q) =>
    StudyStatsResponse.parse(
      await api.request(StudyStatsRoutes.stats + query(q)),
    ),
  sessions: async (q) =>
    StudySessionsResponse.parse(
      await api.request(StudyStatsRoutes.sessions + query(q)),
    ),
};

export const studyStatsRepository = pickRepository('study', {
  remote: remoteStudyStatsRepository,
  fake: fakeStudyStatsRepository,
});

// S-STUDY-01: the app remembers the last cycle chosen; the first time is 50/10.
const CYCLE_KEY = 'solo.last-cycle';
export const cycleMemory = {
  load: async (): Promise<CycleConfig | null> => {
    const raw = await SecureStore.getItemAsync(CYCLE_KEY).catch(() => null);
    try {
      return raw ? (CycleConfig.safeParse(JSON.parse(raw)).data ?? null) : null;
    } catch {
      return null;
    }
  },
  save: (c: CycleConfig) =>
    SecureStore.setItemAsync(CYCLE_KEY, JSON.stringify(c)).catch(() => {}),
};
