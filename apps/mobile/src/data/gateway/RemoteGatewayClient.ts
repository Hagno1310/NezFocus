import {
  GATEWAY_VERSION,
  GatewayCloseCode,
  GatewayOp,
  ServerFrame,
  SessionEndReason,
  parseDispatch,
  type AppState,
  type ClientFrame,
  type Identify,
} from '@nezfocus/shared';
import type { GatewayClient } from '../../domain/gateway/GatewayClient';
import {
  emitGatewayEvent,
  gatewayStore,
  type GatewayStatus,
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
  let appState: AppState['state'] = 'foreground';
  let paused = false; // closed on purpose in the background
  let identified = false;
  let awaitingAck = false;
  let missedAcks = 0;
  let heartbeat: ReturnType<typeof setTimeout> | undefined;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let backgroundClose: ReturnType<typeof setTimeout> | undefined;

  const setStatus = (status: GatewayStatus) =>
    gatewayStore.setState({ status });

  const send = (frame: ClientFrame) => socket?.send(JSON.stringify(frame));
  const sendHeartbeat = () => send({ op: GatewayOp.HEARTBEAT, d: seq || null });
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

  // Handlers go first so a dropped socket's late close event cannot schedule a second reconnect.
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
    sendHeartbeat();
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
      return; // ponytail: unreadable frames are dropped silently; log them with Sentry, P4-B2.1 (#191)
    }
    switch (frame.op) {
      case GatewayOp.HELLO:
        startHeartbeat(frame.d.heartbeat_interval);
        return void identify();
      case GatewayOp.HEARTBEAT_ACK:
        awaitingAck = false;
        return;
      case GatewayOp.HEARTBEAT:
        return sendHeartbeat();
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
          if (running && !paused) scheduleReconnect(); // offline or 5xx: try again later
          return;
        }
        if (!running || paused) return;
        if (!token) return stop();
        // Only the first retry skips the backoff, so a token the backend keeps refusing cannot spin.
        if (attempt > 0) return scheduleReconnect();
        attempt++;
        return connect();
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
    paused = false;
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

  // A dead network kills the socket without a close event; drop it now and retry as soon as it is back.
  function setOnline(online: boolean) {
    if (!running || paused) return;
    if (!online) {
      if (!socket) return;
      detach(GatewayCloseCode.UNKNOWN_ERROR);
      return scheduleReconnect();
    }
    if (!socket) {
      attempt = 0;
      connect();
    }
  }

  function setAppState(next: AppState['state']) {
    if (next === appState) return;
    appState = next;
    gatewayStore.setState({ foreground: next === 'foreground' });
    if (identified) send({ op: GatewayOp.APP_STATE, d: { state: next } });
    if (!running) return;
    clearTimeout(backgroundClose);
    if (next === 'background') {
      // ponytail: always closes; voice / Room Session keep it open with P3-B1.5 (#141).
      backgroundClose = setTimeout(() => {
        clearTimeout(reconnect);
        detach(NORMAL_CLOSURE);
        paused = true;
        setStatus('paused');
      }, BACKGROUND_CLOSE_MS);
    } else if (paused) {
      paused = false;
      attempt = 0;
      connect();
    }
  }

  return { start, stop, setAppState, setOnline };
}
