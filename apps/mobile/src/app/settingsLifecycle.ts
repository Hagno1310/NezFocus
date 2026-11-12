import { appearance } from '../data/settings';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { sessionStore } from '../domain/session/sessionStore';
import { settingsStore } from '../domain/settings/settingsStore';

// SRS 5.4: keeps settingsStore in step with READY / USER_SETTINGS_UPDATE (another device's
// change shows on an open S-ME-04/05/06), with this phone's unsent theme / language on top;
// forgets the settings on sign-out but keeps the theme and language of the phone.
export function startSettingsLifecycle() {
  void appearance.load();
  const stopEvents = onGatewayEvent((event) => {
    if (event.t === 'READY') appearance.fromServer(event.d.settings);
    if (event.t === 'USER_SETTINGS_UPDATE') appearance.fromServer(event.d);
  });
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (prev.status === 'signed-in' && s.status !== 'signed-in')
      settingsStore.setState({ settings: null });
  });
  return () => {
    stopEvents();
    stopSession();
  };
}
