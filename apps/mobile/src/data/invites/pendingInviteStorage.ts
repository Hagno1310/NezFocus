import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingInviteStorage } from '../../domain/invites/pendingInvite';

// SRS 7.3.2: local state that is not secret goes to AsyncStorage (not the keystore).
const KEY = 'invite.pending';

export const asyncPendingInviteStorage: PendingInviteStorage = {
  load: () => AsyncStorage.getItem(KEY),
  save: (raw) => AsyncStorage.setItem(KEY, raw),
  clear: () => AsyncStorage.removeItem(KEY),
};
