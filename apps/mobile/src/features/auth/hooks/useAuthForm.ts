import { useEffect, useState } from 'react';

export { useOnline } from '../../gateway/hooks/useOnline';

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
