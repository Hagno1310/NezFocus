import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState,
} from 'expo-network';
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
    if (state === 'active') gatewayClient.setAppState('foreground');
    if (state === 'background') gatewayClient.setAppState('background');
  });

  // isConnected is undefined while unknown: treat as online so the banner waits for a real answer.
  const setNetwork = ({ isConnected }: NetworkState) =>
    gatewayStore.setState({ online: isConnected !== false });
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
