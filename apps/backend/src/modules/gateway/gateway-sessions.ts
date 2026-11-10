import type { Device } from './presence.js';
import {
  GatewayCloseCode,
  GatewayOp,
  type AppState,
  type DispatchEventName,
  type DispatchPayload,
  type SessionEndReason,
} from '@nezfocus/shared';

export const HEARTBEAT_INTERVAL_MS = 41_250; // SRS 5.4 HELLO
// SRS 5.4 resume buffer: 1000 events or 60 s per session.
const BUFFER_EVENTS = 1000;
const BUFFER_MS = 60_000;

export interface SessionSocket {
  sendText(text: string): void;
  close(code: number, reason?: string): void;
}

type Buffered = { s: number; at: number; text: string };

export type GatewaySession = {
  id: bigint;
  userId: bigint;
  authSessionId: bigint;
  seq: number;
  buffer: Buffered[];
  socket: SessionSocket | null;
  appState: AppState['state'];
  expiry?: ReturnType<typeof setTimeout>;
  // REQ-AUTH-05: what presence reads of this device.
  lastSeenAt: number;
  afk: boolean;
  backgroundSince: number | null;
};

export type ResumeResult =
  | { ok: true; session: GatewaySession }
  | { ok: false; error: 'invalid_session' | 'invalid_seq' };

// ponytail: khi running 2+ processes: move sessions to Redis (SRS 5.4). In memory now (one
// process, SRS 7.1.1), so RESUME does not survive a deploy.
export class GatewaySessions {
  private readonly sessions = new Map<bigint, GatewaySession>();

  constructor(private readonly ids: { next(): bigint }) {}

  create(userId: bigint, authSessionId: bigint, socket: SessionSocket) {
    const session: GatewaySession = {
      id: this.ids.next(),
      userId,
      authSessionId,
      seq: 0,
      buffer: [],
      socket,
      appState: 'foreground', // the app connects from the foreground
      lastSeenAt: Date.now(),
      afk: false,
      backgroundSince: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  resume(
    sessionId: bigint,
    authSessionId: bigint,
    seq: number,
    socket: SessionSocket,
  ): ResumeResult {
    const session = this.sessions.get(sessionId);
    if (!session || session.authSessionId !== authSessionId)
      return { ok: false, error: 'invalid_session' };
    if (seq > session.seq) return { ok: false, error: 'invalid_seq' };
    this.prune(session);
    const oldest = session.buffer[0]?.s ?? session.seq + 1;
    if (seq + 1 < oldest) return { ok: false, error: 'invalid_session' };

    clearTimeout(session.expiry);
    session.lastSeenAt = Date.now();
    const previous = session.socket;
    // Swap first: closing the old socket calls detach(), which must not start an expiry.
    session.socket = socket;
    if (previous && previous !== socket)
      previous.close(GatewayCloseCode.UNKNOWN_ERROR, 'resumed elsewhere');
    for (const event of session.buffer)
      if (event.s > seq) socket.sendText(event.text);
    return { ok: true, session };
  }

  // The socket went away: keep the session resumable for the buffer window.
  detach(session: GatewaySession, socket: SessionSocket) {
    if (session.socket !== socket) return;
    session.socket = null;
    session.expiry = setTimeout(
      () => this.sessions.delete(session.id),
      BUFFER_MS,
    );
  }

  dispatch<T extends DispatchEventName>(
    session: GatewaySession,
    t: T,
    d: DispatchPayload<T>,
  ) {
    const s = ++session.seq;
    const text = JSON.stringify({ op: GatewayOp.DISPATCH, s, t, d });
    session.buffer.push({ s, at: Date.now(), text });
    this.prune(session);
    session.socket?.sendText(text);
  }

  async dispatchToUser<T extends DispatchEventName>(
    userId: bigint,
    t: T,
    d: DispatchPayload<T>,
  ) {
    for (const session of this.sessions.values())
      if (session.userId === userId) this.dispatch(session, t, d);
  }

  // REQ-AUTH-04 AC2 / AUTH-07 AC1: close with 4004 + revoke_reason; the session cannot be resumed.
  revoke(authSessionId: bigint, reason: SessionEndReason) {
    for (const session of [...this.sessions.values()]) {
      if (session.authSessionId !== authSessionId) continue;
      clearTimeout(session.expiry);
      this.sessions.delete(session.id);
      session.socket?.close(GatewayCloseCode.AUTHENTICATION_FAILED, reason);
    }
  }

  setAppState(session: GatewaySession, state: AppState['state']) {
    if (state === session.appState) return;
    session.appState = state;
    session.backgroundSince = state === 'background' ? Date.now() : null;
  }

  // Any frame from the device, heartbeats included (AUTH-05 AC3).
  touch(session: GatewaySession) {
    session.lastSeenAt = Date.now();
  }

  devicesOf(userId: bigint): Device[] {
    const devices: Device[] = [];
    for (const s of this.sessions.values())
      if (s.userId === userId)
        devices.push({
          connected: s.socket !== null,
          lastSeenAt: s.lastSeenAt,
          foreground: s.appState === 'foreground',
          afk: s.afk,
          backgroundSince: s.backgroundSince,
        });
    return devices;
  }

  // DEC-34: for push decisions (REQ-NOTIF-02/04) and Idle presence.
  hasForegroundSession(userId: bigint) {
    for (const session of this.sessions.values())
      if (
        session.userId === userId &&
        session.socket &&
        session.appState === 'foreground'
      )
        return true;
    return false;
  }

  private prune(session: GatewaySession) {
    const cutoff = Date.now() - BUFFER_MS;
    const buffer = session.buffer;
    let drop = Math.max(0, buffer.length - BUFFER_EVENTS);
    while (drop < buffer.length && buffer[drop].at < cutoff) drop++;
    if (drop) buffer.splice(0, drop);
  }
}
