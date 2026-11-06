import type { DispatchEvent } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';

// idle = signed out; paused = closed on purpose in the background (SRS 7.3.3).
export type GatewayStatus = 'idle' | 'connecting' | 'connected' | 'paused';
export type ConnectionBanner = 'offline' | 'reconnecting';

type GatewayState = {
  status: GatewayStatus;
  online: boolean; // the phone reports a network
  foreground: boolean;
  banner: ConnectionBanner | null;
};

export const gatewayStore = createStore<GatewayState>(() => ({
  status: 'idle',
  online: true,
  foreground: true,
  banner: null,
}));

// S-MOD-04: what the banner would say right now, before the 3 s rule.
const problem = (s: GatewayState): ConnectionBanner | null => {
  if (!s.foreground || s.status === 'idle' || s.status === 'paused')
    return null;
  if (!s.online) return 'offline';
  return s.status === 'connected' ? null : 'reconnecting';
};

const BANNER_DELAY_MS = 3000;

export function watchConnectionBanner() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = (s: GatewayState) => {
    const next = problem(s);
    if (!next) {
      clearTimeout(timer);
      timer = undefined;
      if (s.banner) gatewayStore.setState({ banner: null });
      return;
    }
    if (s.banner) {
      if (s.banner !== next) gatewayStore.setState({ banner: next });
      return;
    }
    timer ??= setTimeout(() => {
      timer = undefined;
      gatewayStore.setState({ banner: problem(gatewayStore.getState()) });
    }, BANNER_DELAY_MS);
  };
  const unsubscribe = gatewayStore.subscribe(update);
  update(gatewayStore.getState());
  return () => {
    unsubscribe();
    clearTimeout(timer);
  };
}

// Screens subscribe through hooks; only GatewayClient implementations emit.
const listeners = new Set<(event: DispatchEvent) => void>();

export const onGatewayEvent = (listener: (event: DispatchEvent) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitGatewayEvent = (event: DispatchEvent) => {
  for (const listener of listeners) listener(event);
};
