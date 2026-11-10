import type { PresenceEvent, PresenceStatus } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { presenceSync } from '../../../data/presence';
import { presenceStore } from '../../../domain/presence/presence';

const offline = (userId: string): PresenceEvent => ({
  user_id: userId,
  status: 'offline',
  activity: null,
});

// Someone else as I see them (Invisible arrives as offline). For PresenceDot / ActivityLine.
export function usePresence(userId: string): PresenceEvent {
  return useStore(presenceStore, (s) => s.others[userId]) ?? offline(userId);
}

// The status I picked, for S-ME-02's status sheet (P1-A4.4 #73).
export function useMyStatus(): [PresenceStatus, (s: PresenceStatus) => void] {
  const mine = useStore(presenceStore, (s) => s.mine);
  return [mine, presenceSync.setMine];
}
