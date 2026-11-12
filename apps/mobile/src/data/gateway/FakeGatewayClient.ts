import type {
  PresenceEvent,
  CurrentUser,
  ServerSummary,
  DispatchEvent,
  DispatchEventName,
  DispatchPayload,
} from '@nezfocus/shared';
import type { GatewayClient } from '../../domain/gateway/GatewayClient';
import {
  emitGatewayEvent,
  gatewayStore,
} from '../../domain/gateway/gatewayStore';

// One step: `after` ms from start(), the event the real backend would send.
export type ScenarioStep = {
  [T in DispatchEventName]: { after: number; t: T; d: DispatchPayload<T> };
}[DispatchEventName];

// Sample data of docs/design/screens/README.md.
export const AN: CurrentUser = {
  id: '1',
  email: 'an.nguyen@gmail.com',
  username: 'an.nguyen',
  display_name: 'An',
  bio: null,
  avatar: null,
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};

// EXPO_PUBLIC_FAKE=gateway (WORKFLOW 4.2): always connected, plays `scenario` after READY.
export function createFakeGatewayClient(
  scenario: ScenarioStep[],
  servers: () => ServerSummary[] = () => [],
  presences: PresenceEvent[] = [],
): GatewayClient {
  let timers: ReturnType<typeof setTimeout>[] = [];
  let seq = 0;

  const emit = (step: Pick<ScenarioStep, 't' | 'd'>) =>
    emitGatewayEvent({ ...step, s: ++seq } as DispatchEvent);

  return {
    start() {
      seq = 0;
      gatewayStore.setState({ status: 'connected' });
      emit({
        t: 'READY',
        d: {
          session_id: '100',
          user: AN,
          servers: servers(),
          preferred_status: 'online',
          presences,
        },
      });
      timers = scenario.map((step) => setTimeout(() => emit(step), step.after));
    },
    stop() {
      timers.forEach(clearTimeout);
      timers = [];
      gatewayStore.setState({ status: 'idle' });
    },
    setAppState(state) {
      gatewayStore.setState({ foreground: state === 'foreground' });
    },
    setOnline() {},
    setPresence() {},
  };
}
