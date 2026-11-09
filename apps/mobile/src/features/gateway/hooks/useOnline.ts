import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';

// The phone's network, reported app-wide by gatewayLifecycle (also before sign-in).
export const useOnline = () => useStore(gatewayStore, (s) => s.online);
