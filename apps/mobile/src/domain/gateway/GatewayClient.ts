import type { AppState } from '@nezfocus/shared';

// SRS 7.3: the app keeps one Gateway connection; screens get events through gatewayStore hooks.
export interface GatewayClient {
  start(): void;
  stop(): void; // also forgets the session: the next start() IDENTIFYs
  setAppState(state: AppState['state']): void; // DEC-34
  setOnline(online: boolean): void;
}
