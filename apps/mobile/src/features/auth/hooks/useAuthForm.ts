import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { i18n } from '../../../shared/i18n';
import { showToast } from '../../../shared/ui/Toast';

// The phone's network, reported app-wide by gatewayLifecycle (also before sign-in).
export const useOnline = () => useStore(gatewayStore, (s) => s.online);

// Spec 01 › Chỉ ghi luật: a second tap while the first request runs sends nothing.
// The ref blocks taps that land before React re-renders the button as loading.
export function useSubmit<A extends unknown[]>(
  action: (...args: A) => Promise<void>,
) {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (...args: A) => {
      if (running.current) return;
      running.current = true;
      setPending(true);
      try {
        await action(...args);
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [action],
  );
  return { run, pending };
}

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

// SRS 3.4 generic toasts, for errors a screen has no sentence of its own for.
export const showErrorToast = (kind: 'network' | 'other') =>
  showToast({ message: i18n.t(`auth.errors.${kind}`) });
