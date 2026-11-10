import { AppState } from 'react-native';
import { presenceSync } from '../data/presence';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import {
  emptyPresence,
  presenceStore,
  reducePresence,
} from '../domain/presence/presence';
import { sessionStore } from '../domain/session/sessionStore';

// REQ-AUTH-05: keeps presenceStore in step with READY / PRESENCE_UPDATE and counts the 10 idle
// minutes while signed in and in the foreground. Touches come from App's root view.
export function startPresenceLifecycle() {
  const stopEvents = onGatewayEvent((event) =>
    presenceStore.setState(reducePresence(presenceStore.getState(), event)),
  );

  const sync = () =>
    presenceSync.setForeground(
      sessionStore.getState().status === 'signed-in' &&
        AppState.currentState === 'active',
    );
  sync();
  const app = AppState.addEventListener('change', sync);
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status === prev.status) return;
    if (s.status !== 'signed-in') presenceStore.setState(emptyPresence);
    sync();
  });

  return () => {
    stopEvents();
    app.remove();
    stopSession();
    presenceSync.setForeground(false);
  };
}
