import { SoloRoutes } from '@nezfocus/shared';
import * as SecureStore from 'expo-secure-store';
import type { SoloMemory, SoloRepository } from '../../domain/study/solo';
import { api } from '../api';

export const soloRepository: SoloRepository = {
  start: (cycle_config) =>
    api.request(SoloRoutes.start, { method: 'POST', body: { cycle_config } }),
  current: () => api.request(SoloRoutes.current),
  get: (id) => api.request(SoloRoutes.byId(id)),
  act: (id, action) =>
    api.request(SoloRoutes.byId(id), { method: 'PATCH', body: action }),
};

// ponytail: SecureStore as the only key-value store installed; move to op-sqlite / MMKV when one lands.
const KEY = 'solo.last-id';

export const soloMemory: SoloMemory = {
  lastId: () => SecureStore.getItemAsync(KEY),
  remember: (id) => SecureStore.setItemAsync(KEY, id),
  forget: () => SecureStore.deleteItemAsync(KEY),
};
