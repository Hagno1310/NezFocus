import type {
  AppState,
  PresenceUpdate,
  VoiceStateUpdate,
} from '@nezfocus/shared';

// SRS 7.3: the app keeps one Gateway connection; screens get events through gatewayStore hooks.
export interface GatewayClient {
  start(): void;
  stop(): void; // also forgets the session: the next start() IDENTIFYs
  setAppState(state: AppState['state']): void; // DEC-34
  setOnline(online: boolean): void;
  setPresence(presence: PresenceUpdate): void; // op 3, REQ-AUTH-05; resent after each READY / RESUMED
  subscribe(serverId: string | null): void; // op 8, REQ-MSG-07: the open server; resent after each READY
  updateVoice(d: VoiceStateUpdate): void;
  setKeepAlive(on: boolean): void; // SRS 7.3.3: stay open in the background (in a voice room) // op 4, REQ-VC-01; one made offline goes after READY / RESUMED
}
