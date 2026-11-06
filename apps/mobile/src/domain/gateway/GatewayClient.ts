// SRS 7.3: the app keeps one Gateway connection; screens get events through gatewayStore hooks.
export interface GatewayClient {
  start(): void; // signed in
  stop(): void; // signed out: close and forget the session
  setAppState(state: 'foreground' | 'background'): void; // DEC-34
}
