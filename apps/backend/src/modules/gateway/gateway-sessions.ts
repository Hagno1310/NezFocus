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

// What GatewaySessions needs from a live connection.
export interface SessionSocket {
  sendText(text: string): void;
  close(code: number, reason?: string): void;
}

type Buffered = { s: number; at: number; text: string };

type Session = {
  id: bigint;
  userId: bigint;
  authSessionId: bigint;
  seq: number;
  buffer: Buffered[];
  socket: SessionSocket | null;
  appState: AppState['state'];
  expiry?: ReturnType<typeof setTimeout>;
};

export type ResumeResult =
  | { ok: true; session: Session }
  | { ok: false; error: 'invalid_session' | 'invalid_seq' };

// ponytail: in-memory, fine for the single backend process of the đồ án (SRS 7.1.1, REQ-MSG-07);
// SRS 5.4 puts the buffer in Redis so RESUME survives a deploy: move it there before running 2+ processes.
export class GatewaySessions {
  private readonly sessions = new Map<bigint, Session>();

  constructor(private readonly ids: { next(): bigint }) {}

  create(userId: bigint, authSessionId: bigint, socket: SessionSocket) {
    const session: Session = {
      id: this.ids.next(),
      userId,
      authSessionId,
      seq: 0,
      buffer: [],
      socket,
      appState: 'foreground', // the app connects from the foreground
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
    if (session.socket && session.socket !== socket)
      session.socket.close(GatewayCloseCode.UNKNOWN_ERROR, 'resumed elsewhere');
    session.socket = socket;
    for (const event of session.buffer)
      if (event.s > seq) socket.sendText(event.text);
    return { ok: true, session };
  }

  // The socket went away: keep the session resumable for the buffer window.
  detach(session: Session, socket: SessionSocket) {
    if (session.socket !== socket) return;
    session.socket = null;
    session.expiry = setTimeout(
      () => this.sessions.delete(session.id),
      BUFFER_MS,
    );
  }

  dispatch<T extends DispatchEventName>(
    session: Session,
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

  setAppState(session: Session, state: AppState['state']) {
    session.appState = state;
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

  private prune(session: Session) {
    const cutoff = Date.now() - BUFFER_MS;
    const buffer = session.buffer;
    let drop = Math.max(0, buffer.length - BUFFER_EVENTS);
    while (drop < buffer.length && buffer[drop].at < cutoff) drop++;
    if (drop) buffer.splice(0, drop);
  }
}

export type GatewaySession = Session;
