import type { GatewayClient } from '../gateway/GatewayClient';
import type {
  DispatchEvent,
  PresenceEvent,
  PresenceStatus,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';

export type PresenceState = {
  mine: PresenceStatus; // the status I picked (Invisible included), not what others see
  others: Record<string, PresenceEvent>; // by user id; absent = offline
};

export const emptyPresence: PresenceState = { mine: 'online', others: {} };

export function reducePresence(
  state: PresenceState,
  event: DispatchEvent,
): PresenceState {
  if (event.t === 'READY')
    return {
      mine: event.d.preferred_status,
      others: Object.fromEntries(event.d.presences.map((p) => [p.user_id, p])),
    };
  if (event.t !== 'PRESENCE_UPDATE') return state;
  const { [event.d.user_id]: _, ...others } = state.others;
  if (event.d.status !== 'offline' || event.d.activity)
    others[event.d.user_id] = event.d;
  return { ...state, others };
}

export const presenceStore = createStore<PresenceState>(() => emptyPresence);

// REQ-AUTH-05 AC1: 10 min without a touch in the foreground → afk (op 3, chốt 10/11/2026).
export const IDLE_AFTER_MS = 10 * 60_000;

export function createIdleTimer(onChange: (afk: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let afk = false;
  const set = (next: boolean) => {
    if (next === afk) return;
    afk = next;
    onChange(afk);
  };
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => set(true), IDLE_AFTER_MS);
  };
  return {
    start() {
      set(false);
      arm();
    },
    touch() {
      set(false);
      arm();
    },
    // In the background the backend counts 5 min from APP_STATE (DEC-34).
    stop() {
      clearTimeout(timer);
    },
  };
}

// The one place that sends op 3: my chosen status plus the afk of this device.
export function createPresenceSync(client: Pick<GatewayClient, 'setPresence'>) {
  let afk = false;
  // afk alone never carries the status, so it cannot undo one picked on another device.
  const idle = createIdleTimer((next) => {
    afk = next;
    client.setPresence({ afk });
  });
  return {
    setMine(status: PresenceStatus) {
      presenceStore.setState({ mine: status });
      client.setPresence({ status, afk });
    },
    touch: () => idle.touch(),
    // Only counted in the foreground; the backend handles the background (DEC-34).
    setForeground(foreground: boolean) {
      if (foreground) idle.start();
      else idle.stop();
    },
  };
}
