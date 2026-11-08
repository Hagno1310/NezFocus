import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';

// The phone's network, reported app-wide by gatewayLifecycle (also before sign-in).
export const useOnline = () => useStore(gatewayStore, (s) => s.online);

// Re-renders every second until `until` (epoch ms) has passed: countdowns.
export function useNow(until: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(timer);
    };
    const timer = setInterval(tick, 1000);
    const first = setTimeout(tick, 0); // `now` may be stale from before `until` changed
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [until]);
  return now;
}
