import type { PresenceEvent, PresenceStatus } from '@nezfocus/shared';
import { useStore } from 'zustand';
import { presenceSync } from '../../../data/presence';
import { presenceStore } from '../../../domain/presence/presence';
import { sessionStore } from '../../../domain/session/sessionStore';

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

// A row that may be mine: my own status (Invisible shows as offline), never my activity
// (02 › Dữ liệu nhất quán: no activity on An's own row).
export function useShownPresence(userId: string): PresenceEvent {
  const me = useStore(sessionStore, (s) => s.user?.id);
  const mine = useStore(presenceStore, (s) => s.mine);
  const other = usePresence(userId);
  if (userId !== me) return other;
  return {
    user_id: userId,
    status: mine === 'invisible' ? 'offline' : mine,
    activity: null,
  };
}
