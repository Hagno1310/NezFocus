import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { sessionStore } from '../domain/session/sessionStore';
import {
  reduceSettings,
  settingsStore,
} from '../domain/settings/settingsStore';

// SRS 5.4: keeps settingsStore in step with READY / USER_SETTINGS_UPDATE (another device's
// change shows on an open S-ME-04/05/06); forgets them on sign-out.
export function startSettingsLifecycle() {
  const stopEvents = onGatewayEvent((event) =>
    settingsStore.setState(reduceSettings(settingsStore.getState(), event)),
  );
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (prev.status === 'signed-in' && s.status !== 'signed-in')
      settingsStore.setState({ settings: null });
  });
  return () => {
    stopEvents();
    stopSession();
  };
}
