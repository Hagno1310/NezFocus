import { roomTimer } from '@nezfocus/shared';
import { WifiOff } from 'lucide-react-native';
import { AppState } from 'react-native';
import { gatewayClient } from '../data/gateway';
import { playPhaseAlert } from '../data/phaseAlert';
import { gatewayStore, onGatewayEvent } from '../domain/gateway/gatewayStore';
import {
  reduceRoomSessions,
  roomSessionsStore,
} from '../domain/study/roomSessions';
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

export function startRoomSessionLifecycle() {
  const stopEvents = onGatewayEvent((event) =>
    roomSessionsStore.setState((s) => reduceRoomSessions(s, event, Date.now())),
  );

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
      if (AppState.currentState === 'active' && Date.now() - due < LATE_MS)
        playPhaseAlert();
      arm();
    }, left);
  };
  const stopArm = roomSessionsStore.subscribe(arm);
  const stopCall = voiceStore.subscribe((s, prev) => {
    if (
      s.call?.channelId !== prev.call?.channelId ||
      s.call?.phase !== prev.call?.phase
    )
      arm();
  });

  return () => {
    stopEvents();
    clearInterval(beat);
    stopGap();
    clearTimeout(alarm);
    stopArm();
    stopCall();
  };
}
