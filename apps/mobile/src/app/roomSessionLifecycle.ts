import { roomTimer } from '@nezfocus/shared';
import { LampDesk, WifiOff } from 'lucide-react-native';
import { AccessibilityInfo, AppState } from 'react-native';
import { gatewayClient } from '../data/gateway';
import { playPhaseAlert } from '../data/phaseAlert';
import { gatewayStore, onGatewayEvent } from '../domain/gateway/gatewayStore';
import {
  dropSummary,
  reduceRoomSessions,
  soloEndExpected,
  roomSessionsStore,
} from '../domain/study/roomSessions';
import { serverRepository } from '../data/servers';
import { homeStore, setServerDetail } from '../domain/servers/homeStore';
import { voiceView } from '../domain/voice/voiceView';
import { voiceStore } from '../domain/voice/voiceSession';
import { i18n } from '../shared/i18n';
import { showToast } from '../shared/ui/Toast';

const HEARTBEAT_MS = 60_000; // REQ-STUDY-15 (2)
const GAP_MS = 3 * 60_000; // REQ-STUDY-15 AC2: away longer than this is not counted
// A timer firing this late means the app slept through the change: no sound (7.3.6 step 4).
const LATE_MS = 2000;

// The Room Session of the room I sit in, if it counts me.
function mine() {
  const call = voiceStore.getState().call;
  if (call?.phase !== 'in') return null;
  const f = roomSessionsStore.getState().byChannel[call.channelId];
  return f?.me ? f : null;
}

// C-06: the change is also spoken, "Chuyển sang Nghỉ ngắn, 5 phút".
function announcePhase() {
  const f = mine();
  if (!f) return;
  const timer = roomTimer(f, roomSessionsStore.getState().offsetMs, Date.now());
  AccessibilityInfo.announceForAccessibility(
    i18n.t('room.a11yPhase', {
      phase: i18n.t(`study.phase.${timer.phase}`),
      minutes: Math.round(timer.totalMs / 60_000),
    }),
  );
}

export function startRoomSessionLifecycle() {
  const stopEvents = onGatewayEvent((event) => {
    roomSessionsStore.setState((s) => reduceRoomSessions(s, event, Date.now()));
    // S-ROOM-EDGE `solo-stopped-by-room-start` (STUDY-10 AC9): someone else started where I sit.
    if (
      event.t === 'SOLO_SESSION_UPDATE' &&
      event.d.solo_session.end_reason === 'joined_room' &&
      !soloEndExpected()
    ) {
      showToast({
        icon: LampDesk,
        message: i18n.t('room.soloStopped', {
          minutes: Math.floor(event.d.solo_session.focused_seconds / 60),
        }),
      });
      return;
    }
    // S-ROOM-EDGE `ended-elsewhere`: not on the room's screen → a Toast; the summary waits there.
    if (event.t !== 'FOCUS_SESSION_END' || event.d.focused_seconds === null)
      return;
    const e = event.d;
    // The summary is for whoever is still in the room; the Toast when its screen is not shown.
    if (voiceStore.getState().call?.channelId !== e.channel_id) {
      dropSummary(e.channel_id);
      return;
    }
    if (voiceView.getState().visible === e.channel_id) return;
    const name = homeStore
      .getState()
      .channels[e.server_id]?.find((c) => c.id === e.channel_id)?.name;
    if (name)
      showToast({
        message: i18n.t('room.endedElsewhere', {
          name,
          minutes: Math.floor((e.focused_seconds ?? 0) / 60),
        }),
      });
  });

  // S-STUDY-01 rooms of servers never opened: their channels (name, CONNECT) come with
  // GET /servers/:id (chốt 27/11/2026, no new endpoint).
  const fetching = new Set<string>();
  const loadServers = () => {
    const home = homeStore.getState();
    for (const f of Object.values(roomSessionsStore.getState().byChannel)) {
      const id = f.server_id;
      if (home.channels[id] || fetching.has(id)) continue;
      if (!home.servers?.some((x) => x.id === id)) continue;
      fetching.add(id);
      serverRepository
        .getServer(id)
        .then(setServerDetail)
        .catch(() => {})
        .finally(() => fetching.delete(id));
    }
  };
  const stopServers = roomSessionsStore.subscribe(loadServers);

  const beat = setInterval(() => {
    const f = mine();
    if (f) gatewayClient.focusHeartbeat(f.id);
  }, HEARTBEAT_MS);

  // S-ROOM-EDGE `reconnected-gap` (CR-28 #39): the app measures the gap itself.
  let lostAt: number | null = null;
  const stopGap = gatewayStore.subscribe((s, prev) => {
    if (prev.status === 'connected' && s.status === 'connecting' && mine())
      lostAt = Date.now();
    if (s.status !== 'connected' || prev.status === 'connected') return;
    const gap = lostAt === null ? 0 : Date.now() - lostAt;
    lostAt = null;
    if (gap > GAP_MS && voiceStore.getState().call?.phase === 'in')
      showToast({
        icon: WifiOff,
        message: i18n.t('room.reconnectedGap', {
          minutes: Math.floor(gap / 60_000),
        }),
      });
  });

  // SRS 3.3: a phase change in the foreground rings once, on the backend's timestamp; one slept
  // through (app reopened after several phases) does not.
  let alarm: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(alarm);
    const f = mine();
    if (!f || f.status !== 'running') return;
    const { offsetMs } = roomSessionsStore.getState();
    const left = roomTimer(f, offsetMs, Date.now()).remainingMs;
    const due = Date.now() + left;
    alarm = setTimeout(() => {
      if (AppState.currentState === 'active' && Date.now() - due < LATE_MS) {
        playPhaseAlert();
        announcePhase();
      }
      arm();
    }, left);
  };
  const stopArm = roomSessionsStore.subscribe(arm);
  const stopCall = voiceStore.subscribe((s, prev) => {
    // The summary stays until a new session or I leave the room (spec 03 › Chỉ ghi luật).
    const was = prev.call?.channelId;
    if (was && was !== s.call?.channelId) dropSummary(was);
    if (
      s.call?.channelId !== prev.call?.channelId ||
      s.call?.phase !== prev.call?.phase
    )
      arm();
  });

  return () => {
    stopEvents();
    stopServers();
    clearInterval(beat);
    stopGap();
    clearTimeout(alarm);
    stopArm();
    stopCall();
  };
}
