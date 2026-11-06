import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState,
} from 'expo-network';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { gatewayClient } from '../data/gateway';
import {
  gatewayStore,
  watchConnectionBanner,
} from '../domain/gateway/gatewayStore';
import { sessionStore } from '../domain/session/sessionStore';

// Connects while signed in, reports AppState (DEC-34) and network (S-MOD-04 offline banner).
export function startGatewayLifecycle() {
  const stopBanner = watchConnectionBanner();

  const sync = (status: string) =>
    status === 'signed-in' ? gatewayClient.start() : gatewayClient.stop();
  sync(sessionStore.getState().status);
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status !== prev.status) sync(s.status);
  });

  const app = AppState.addEventListener('change', (state) => {
    // SRS 7.3.6 step 4: back in the foreground, refetch (the Solo clock resyncs its offset).
    focusManager.setFocused(state === 'active');
    if (state === 'active') gatewayClient.setAppState('foreground');
    if (state === 'background') gatewayClient.setAppState('background');
  });

  // isConnected is undefined while unknown: treat as online so the banner waits for a real answer.
  const setNetwork = ({ isConnected }: NetworkState) => {
    const online = isConnected !== false;
    gatewayStore.setState({ online });
    // Mutations made offline (Solo pause / stop) wait and resend on reconnect.
    onlineManager.setOnline(online);
    gatewayClient.setOnline(online);
  };
  const network = addNetworkStateListener(setNetwork);
  getNetworkStateAsync().then(setNetwork, () => {});

  return () => {
    stopBanner();
    stopSession();
    app.remove();
    network.remove();
    gatewayClient.stop();
  };
}
