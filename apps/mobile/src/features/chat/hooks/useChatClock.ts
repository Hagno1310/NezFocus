import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { settingsStore } from '../../../domain/settings/settingsStore';
import { msUntilMidnight } from '../../../domain/study/stats';
import { deviceTimeZone } from '../../auth/timeZoneList';

// REQ-STUDY-03 time zone; 02 › Edge case "Qua nửa đêm": labels turn over at the user's midnight.
export function useChatClock() {
  const timeZone = useStore(
    settingsStore,
    (s) => s.settings?.timezone ?? deviceTimeZone(),
  );
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setTimeout(
      () => setNow(Date.now()),
      msUntilMidnight(new Date(now), timeZone) + 1000,
    );
    return () => clearTimeout(id);
  }, [now, timeZone]);
  return { now, timeZone };
}
