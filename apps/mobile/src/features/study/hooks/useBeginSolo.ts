import type { CycleConfig } from '@nezfocus/shared';
import { useLastCycle, useStartSolo } from './useSolo';
import { notificationPrompt } from './useSoloAlerts';

// "Bắt đầu" from S-STUDY-01 or S-STUDY-03: remember the cycle, S-ROOM-09 the first time, then S-STUDY-02.
export function useBeginSolo(nav: {
  onOpenSolo: () => void;
  onAskNotifications: () => void;
}) {
  const { cycle, set } = useLastCycle();
  const start = useStartSolo();
  const begin = async (c: CycleConfig = cycle) => {
    set(c);
    if (await notificationPrompt.needed()) return nav.onAskNotifications();
    // 40903 (already running elsewhere) still lands on the Solo screen, showing that session.
    start.mutate(c, { onSettled: () => nav.onOpenSolo() });
  };
  return { begin, cycle, setCycle: set, starting: start.isPending };
}

export const FIRST_FOCUS: CycleConfig = { focus_min: 25, short_break_min: 5 };
