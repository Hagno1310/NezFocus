import {
  ClientFrame,
  GatewayCloseCode,
  GatewayOp,
  type CurrentUser,
  type ServerSummary,
  type SessionEndReason,
} from '@nezfocus/shared';
import {
  HEARTBEAT_INTERVAL_MS,
  type GatewaySession,
  type GatewaySessions,
  type SessionSocket,
} from './gateway-sessions.js';

type Authenticated = {
  ok: true;
  userId: bigint;
  authSessionId: bigint;
  user: CurrentUser;
};

export type Authenticate = (token: string) => Promise<
  // SRS 11.2: no reason = expired / invalid token
  Authenticated | { ok: false; reason: SessionEndReason | null }
>;

// READY's server list (REQ-SRV-01), read when IDENTIFY succeeds.
export type LoadServers = (userId: bigint) => Promise<ServerSummary[]>;

export interface RawSocket {
  send(text: string): void;
  close(code: number, reason?: string): void;
}

// SRS 5.4 lifecycle step 3 counts two missed cycles on the client; the backend allows 1.5.
const HEARTBEAT_DEADLINE_MS = HEARTBEAT_INTERVAL_MS * 1.5;
const RATE_LIMIT_FRAMES = 120; // SRS 11.2 4008
const RATE_LIMIT_WINDOW_MS = 60_000;
const CLIENT_OPS: ReadonlySet<number> = new Set(
  ClientFrame.options.map((o) => o.shape.op.value),
);

// One WebSocket connection: SRS 5.4 handshake, heartbeat and per-connection limits.
export class GatewayConnection implements SessionSocket {
  private session: GatewaySession | null = null;
  private identifying = false;
  private heartbeatTimer?: ReturnType<typeof setTimeout>;
  private identifyTimer?: ReturnType<typeof setTimeout>;
  private windowStart = 0;
  private framesInWindow = 0;
  private isClosed = false;

  constructor(
    private readonly socket: RawSocket,
    private readonly sessions: GatewaySessions,
    private readonly authenticate: Authenticate,
    private readonly loadServers: LoadServers = async () => [],
  ) {}

  open() {
    this.send({
      op: GatewayOp.HELLO,
      d: { heartbeat_interval: HEARTBEAT_INTERVAL_MS },
    });
    this.armHeartbeat();
    // Heartbeats alone would keep an unauthenticated socket open forever.
    this.identifyTimer = setTimeout(() => {
      if (!this.session) this.close(GatewayCloseCode.NOT_AUTHENTICATED);
    }, HEARTBEAT_DEADLINE_MS);
  }

  sendText(text: string) {
    if (!this.isClosed) this.socket.send(text);
  }

  close(code: number, reason = '') {
    if (this.isClosed) return;
    this.closed();
    this.socket.close(code, reason);
  }

  closed() {
    if (this.isClosed) return;
    this.isClosed = true;
    clearTimeout(this.heartbeatTimer);
    clearTimeout(this.identifyTimer);
    if (this.session) this.sessions.detach(this.session, this);
  }

  async receive(text: string) {
    if (this.isClosed || this.overRateLimit()) return;

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return this.close(GatewayCloseCode.DECODE_ERROR);
    }
    const parsed = ClientFrame.safeParse(json);
    if (!parsed.success) {
      const op = (json as { op?: unknown } | null)?.op;
      return this.close(
        typeof op === 'number' && CLIENT_OPS.has(op)
          ? GatewayCloseCode.DECODE_ERROR
          : GatewayCloseCode.UNKNOWN_OPCODE,
      );
    }
    const frame = parsed.data;

    if (frame.op === GatewayOp.HEARTBEAT) {
      this.armHeartbeat();
      return this.send({ op: GatewayOp.HEARTBEAT_ACK, d: null });
    }
    if (frame.op === GatewayOp.IDENTIFY || frame.op === GatewayOp.RESUME) {
      if (this.session || this.identifying)
        return this.close(GatewayCloseCode.ALREADY_AUTHENTICATED);
      this.identifying = true;
      try {
        const auth = await this.authenticate(frame.d.token);
        if (this.isClosed) return;
        if (!auth.ok)
          return this.close(
            GatewayCloseCode.AUTHENTICATION_FAILED,
            auth.reason ?? '',
          );
        if (frame.op === GatewayOp.IDENTIFY) await this.identify(auth);
        else this.resume(auth, BigInt(frame.d.session_id), frame.d.seq);
      } finally {
        this.identifying = false;
      }
      return;
    }
    if (!this.session) return this.close(GatewayCloseCode.NOT_AUTHENTICATED);

    if (frame.op === GatewayOp.APP_STATE)
      this.sessions.setAppState(this.session, frame.d.state);
    // PRESENCE_UPDATE (P1-B4 #13), VOICE_STATE_UPDATE (P3), FOCUS_HEARTBEAT, SUBSCRIBE (P2-B1 #18): not yet.
  }

  private async identify(auth: Authenticated) {
    const servers = await this.loadServers(auth.userId);
    if (this.isClosed) return;
    this.session = this.sessions.create(auth.userId, auth.authSessionId, this);
    this.sessions.dispatch(this.session, 'READY', {
      session_id: this.session.id.toString(),
      user: auth.user,
      servers,
    });
  }

  private resume(auth: Authenticated, sessionId: bigint, seq: number) {
    const result = this.sessions.resume(
      sessionId,
      auth.authSessionId,
      seq,
      this,
    );
    if (!result.ok) {
      if (result.error === 'invalid_seq')
        return this.close(GatewayCloseCode.INVALID_SEQ);
      // The client may IDENTIFY on this same connection.
      return this.send({ op: GatewayOp.INVALID_SESSION, d: false });
    }
    this.session = result.session;
    this.sessions.dispatch(this.session, 'RESUMED', {});
  }

  private send(frame: { op: number; d: unknown }) {
    this.sendText(JSON.stringify(frame));
  }

  private armHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    // 4000: the client reconnects and RESUMEs (SRS 11.2).
    this.heartbeatTimer = setTimeout(
      () => this.close(GatewayCloseCode.UNKNOWN_ERROR, 'heartbeat timeout'),
      HEARTBEAT_DEADLINE_MS,
    );
  }

  // ponytail: khi a client abuses the window edge (~2× through): sliding window (SRS 11.3).
  private overRateLimit() {
    const now = Date.now();
    if (now - this.windowStart >= RATE_LIMIT_WINDOW_MS) {
      this.windowStart = now;
      this.framesInWindow = 0;
    }
    if (++this.framesInWindow <= RATE_LIMIT_FRAMES) return false;
    this.close(GatewayCloseCode.RATE_LIMITED);
    return true;
  }
}
