import type { UserSettings } from '@nezfocus/shared';
import { createStore, type StoreApi } from 'zustand/vanilla';

// SRS 5.4: my settings as READY / USER_SETTINGS_UPDATE last said, with local changes on top.
// null until the first READY of this sign-in.
export type SettingsState = { settings: UserSettings | null };
export type SettingsStore = StoreApi<SettingsState>;

export const createSettingsStore = (settings: UserSettings | null = null) =>
  createStore<SettingsState>(() => ({ settings }));

export const settingsStore = createSettingsStore();
