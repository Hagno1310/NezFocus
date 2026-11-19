import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { settingsStore } from '../../../domain/settings/settingsStore';
import { msUntilMidnight } from '../../../domain/study/stats';
import { deviceTimeZone } from '../../auth/timeZoneList';

// Message times follow the user's time zone (REQ-STUDY-03) and turn over at their midnight
// (02 › Edge case "Qua nửa đêm": "Hôm nay" becomes "Hôm qua").
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
