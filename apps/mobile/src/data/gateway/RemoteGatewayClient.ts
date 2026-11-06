import {
  GATEWAY_VERSION,
  GatewayCloseCode,
  GatewayOp,
  ServerFrame,
  SessionEndReason,
  parseDispatch,
  type ClientFrame,
  type Identify,
} from '@nezfocus/shared';
import type { GatewayClient } from '../../domain/gateway/GatewayClient';
import {
  emitGatewayEvent,
  gatewayStore,
} from '../../domain/gateway/gatewayStore';
import type { EndReason } from '../../domain/session/sessionStore';

// The slice of the RN WebSocket this client uses.
export interface GatewaySocket {
  send(text: string): void;
  close(code?: number, reason?: string): void;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: ((e: { code: number; reason: string }) => void) | null;
}

export interface GatewayClientDeps {
  url: string; // ws(s)://host/gateway
  createSocket: (url: string) => GatewaySocket;
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>; // null = the session ended (ApiClient handled it)
  device: () => Promise<Identify['device']>;
  random: () => number;
  onSessionEnded: (reason: EndReason) => void;
  onUpgradeRequired: () => void;
}

const MAX_BACKOFF_MS = 30_000; // SRS 5.4 lifecycle 3
const BACKGROUND_CLOSE_MS = 30_000; // SRS 7.3.3
const NORMAL_CLOSURE = 1000;

export function createGatewayClient(deps: GatewayClientDeps): GatewayClient {
  let socket: GatewaySocket | null = null;
  let running = false;
  let sessionId: string | null = null;
  let seq = 0;
  let attempt = 0;
  let appState: 'foreground' | 'background' = 'foreground';
  let identified = false;
  let awaitingAck = false;
  let missedAcks = 0;
  let heartbeat: ReturnType<typeof setTimeout> | undefined;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let backgroundClose: ReturnType<typeof setTimeout> | undefined;

  const setStatus = (status: 'idle' | 'connecting' | 'connected' | 'paused') =>
    gatewayStore.setState({ status });

  const send = (frame: ClientFrame) => socket?.send(JSON.stringify(frame));
  const forgetSession = () => {
    sessionId = null;
    seq = 0;
  };

  function connect() {
    clearTimeout(reconnect);
    setStatus('connecting');
    const s = deps.createSocket(
      `${deps.url}?v=${GATEWAY_VERSION}&encoding=json`,
    );
    socket = s;
    s.onmessage = (e) => onFrame(e.data);
    s.onclose = (e) => onClosed(e.code, e.reason);
  }

  // Drops the socket without waiting for its close event.
  function detach(code: number) {
    clearTimeout(heartbeat);
    identified = false;
    const s = socket;
    socket = null;
    if (!s) return;
    s.onmessage = null;
    s.onclose = null;
    s.close(code);
  }

  function scheduleReconnect() {
    setStatus('connecting');
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
    attempt++;
    reconnect = setTimeout(connect, base * (0.5 + deps.random() / 2));
  }

  function beat() {
    if (awaitingAck) missedAcks++;
    else missedAcks = 0;
    // SRS 5.4 lifecycle 3: no ACK for 2 cycles → dead connection.
    if (missedAcks >= 2) {
      detach(GatewayCloseCode.UNKNOWN_ERROR);
      return scheduleReconnect();
    }
    awaitingAck = true;
    send({ op: GatewayOp.HEARTBEAT, d: seq || null });
  }

  function startHeartbeat(interval: number) {
    awaitingAck = false;
    missedAcks = 0;
    const loop = () => {
      beat();
      if (socket) heartbeat = setTimeout(loop, interval);
    };
    // SRS 5.4 lifecycle 1: spread the first beat so a restarted backend is not hit at once.
    heartbeat = setTimeout(loop, interval * deps.random());
  }

  async function identify() {
    const s = socket;
    const token = await deps.getToken();
    if (socket !== s) return;
    if (!token) return stop();
    if (sessionId)
      send({
        op: GatewayOp.RESUME,
        d: { token, session_id: sessionId, seq },
      });
    else
      send({
        op: GatewayOp.IDENTIFY,
        d: { token, device: await deps.device() },
      });
  }

  function onFrame(text: string) {
    let frame: ServerFrame;
    try {
      frame = ServerFrame.parse(JSON.parse(text));
    } catch {
      return; // ponytail: ignore what this build cannot read; a newer backend may send more
    }
    switch (frame.op) {
      case GatewayOp.HELLO:
        startHeartbeat(frame.d.heartbeat_interval);
        return void identify();
      case GatewayOp.HEARTBEAT_ACK:
        awaitingAck = false;
        return;
      case GatewayOp.HEARTBEAT:
        return send({ op: GatewayOp.HEARTBEAT, d: seq || null });
      case GatewayOp.RECONNECT:
        detach(GatewayCloseCode.UNKNOWN_ERROR);
        return connect();
      case GatewayOp.INVALID_SESSION:
        if (!frame.d) forgetSession();
        return void identify();
      case GatewayOp.DISPATCH: {
        seq = frame.s;
        let event;
        try {
          event = parseDispatch(frame);
        } catch {
          return; // a known event with a payload this build cannot read
        }
        if (!event) return;
        if (event.t === 'READY') sessionId = event.d.session_id;
        if (event.t === 'READY' || event.t === 'RESUMED') {
          identified = true;
          attempt = 0;
          setStatus('connected');
          if (appState === 'background')
            send({ op: GatewayOp.APP_STATE, d: { state: appState } });
        }
        emitGatewayEvent(event);
      }
    }
  }

  async function onClosed(code: number, reason: string) {
    detach(code);
    switch (code) {
      case GatewayCloseCode.AUTHENTICATION_FAILED: {
        const revoked = SessionEndReason.safeParse(reason);
        if (revoked.success) {
          stop();
          return deps.onSessionEnded(revoked.data);
        }
        // No reason = the access token expired: refresh, then connect again.
        let token;
        try {
          token = await deps.refreshToken();
        } catch {
          if (running) scheduleReconnect(); // offline or 5xx: try again later
          return;
        }
        if (!running) return;
        return token ? connect() : stop();
      }
      case GatewayCloseCode.UNSUPPORTED_VERSION:
        stop();
        return deps.onUpgradeRequired();
      case GatewayCloseCode.ACCOUNT_UNAVAILABLE:
        stop();
        // ponytail: no lock / delete reason in the contract yet; add one with the account-lock REQ.
        return deps.onSessionEnded('expired');
      case GatewayCloseCode.NOT_AUTHENTICATED:
      case GatewayCloseCode.INVALID_SEQ:
      case GatewayCloseCode.SESSION_TIMED_OUT:
        forgetSession();
    }
    scheduleReconnect();
  }

  function start() {
    if (running) return;
    running = true;
    connect();
  }

  function stop() {
    running = false;
    clearTimeout(reconnect);
    clearTimeout(backgroundClose);
    detach(NORMAL_CLOSURE);
    forgetSession();
    attempt = 0;
    setStatus('idle');
  }

  function setAppState(next: 'foreground' | 'background') {
    if (next === appState) return;
    appState = next;
    gatewayStore.setState({ foreground: next === 'foreground' });
    if (identified) send({ op: GatewayOp.APP_STATE, d: { state: next } });
    if (!running) return;
    clearTimeout(backgroundClose);
    if (next === 'background') {
      // ponytail: always closes; keep it open in voice / Room Session once P3 adds the foreground service.
      backgroundClose = setTimeout(() => {
        clearTimeout(reconnect);
        detach(NORMAL_CLOSURE);
        setStatus('paused');
      }, BACKGROUND_CLOSE_MS);
    } else if (gatewayStore.getState().status === 'paused') {
      attempt = 0;
      connect();
    }
  }

  return { start, stop, setAppState };
}
