import { MicOff, RotateCw } from 'lucide-react-native';
import { AppState } from 'react-native';
import { gatewayClient } from '../data/gateway';
import { voiceSession } from '../data/voice';
import { backgroundService } from '../data/voice/backgroundService';
import { cameraPermission } from '../data/voice/cameraPermission';
import { micPermission } from '../data/voice/micPermission';
import { savedRoom } from '../data/voice/savedRoom';
import { dmView } from '../domain/dm/dmStore';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';
import { mediaDenied } from '../domain/voice/mediaDenied';
import { ALIVE_EVERY_MS, rejoinTarget } from '../domain/voice/rejoin';
import { voiceNotice } from '../domain/voice/voiceNotice';
import {
  voiceStore,
  type VoiceCall,
  type VoiceEnd,
  type VoiceTarget,
} from '../domain/voice/voiceSession';
import { closeVoice, openVoice, voiceView } from '../domain/voice/voiceView';
import { i18n } from '../shared/i18n';
import { showToast } from '../shared/ui/Toast';

const channelName = ({ serverId, channelId }: VoiceTarget) =>
  homeStore.getState().channels[serverId]?.find((c) => c.id === channelId)
    ?.name;

// CR-28 #30: what my seat ending by the backend looks like. Kick / ban / leaving the server have
// their own screens (02 S-HOME-EDGE).
function onEnded(end: VoiceEnd, name: string | undefined) {
  if (end.reason === 'disconnected_by_mod') {
    // S-SET-EDGE `disconnected-by-mod`: this room's preview, joinable again at once.
    openVoice(end);
    showToast({ message: i18n.t('voice.disconnectedByMod') });
    return;
  }
  if (end.reason === 'other_device') {
    // S-ROOM-EDGE `other-device`: back to this room's preview, with the Dialog.
    openVoice(end);
    voiceNotice.setState({ otherDevice: end });
    return;
  }
  if (end.reason !== 'channel_deleted') return;
  if (voiceView.getState().open?.channelId === end.channelId) closeVoice();
  // chốt 26/11/2026 (P3-B1): back to the screen before + "{phòng} không còn khả dụng".
  if (name) showToast({ message: i18n.t('voice.gone', { name }) });
}

// VC-01 AC6: opened again within 3 minutes of being killed in a room, and in the foreground
// (Android 14 starts no microphone service from the background) → back in, mic and camera off.
async function rejoin() {
  const saved = await savedRoom.load();
  const { seats } = voiceStore.getState();
  const target = rejoinTarget(
    saved,
    Date.now(),
    seats,
    sessionStore.getState().user?.id ?? null,
  );
  if (!target) return void savedRoom.clear();
  openVoice(target);
  if ((await voiceSession.join(target)) !== 'joined') return;
  const name = channelName(target);
  if (name)
    showToast({ icon: RotateCw, message: i18n.t('voice.rejoined', { name }) });
}

// REQ-VC-01: seats from READY / VOICE_STATE_UPDATE; the call keeps the app alive in the
// background and on the phone (to come back after a kill); it ends with the session.
export function startVoiceLifecycle() {
  // The channel may already be gone from the drawer when its VOICE_STATE_UPDATE comes.
  let callName: string | undefined;
  // Once per app start: the first READY seen in the foreground decides a rejoin.
  let rejoinPending = true;
  const tryRejoin = () => {
    if (!rejoinPending || AppState.currentState !== 'active') return;
    if (sessionStore.getState().status !== 'signed-in') return;
    rejoinPending = false;
    void rejoin();
  };
  let ready = false;
  const stopEvents = onGatewayEvent((event) => {
    voiceSession.apply(event);
    if (event.t !== 'READY') return;
    ready = true;
    tryRejoin();
  });
  const remember = () => {
    const call = voiceStore.getState().call;
    if (call) callName = channelName(call) ?? callName;
  };
  const stopHomeNames = homeStore.subscribe(remember);

  // In a room: the foreground service, the Gateway open in the background, the room saved.
  let alive: ReturnType<typeof setInterval> | undefined;
  const save = (c: VoiceCall) =>
    void savedRoom.save({
      serverId: c.serverId,
      channelId: c.channelId,
      aliveAt: Date.now(),
    });
  const stopCall = voiceStore.subscribe((s, prev) => {
    remember();
    const now = s.call?.phase === 'in' ? s.call : null;
    const was = prev.call?.phase === 'in' ? prev.call : null;
    if (
      now &&
      (!was || now.channelId !== was.channelId || now.camera !== was.camera)
    )
      backgroundService.start({
        title: i18n.t('voice.service.title'),
        text: channelName(now) ?? '',
        channelName: i18n.t('voice.service.channel'),
        camera: now.camera,
      });
    if (now && !was) {
      gatewayClient.setKeepAlive(true);
      save(now);
      alive = setInterval(() => {
        const c = voiceStore.getState().call;
        if (c) save(c);
      }, ALIVE_EVERY_MS);
    }
    if (!s.call && prev.call) {
      backgroundService.stop();
      gatewayClient.setKeepAlive(false);
      clearInterval(alive);
      void savedRoom.clear();
    }
  });

  const stopEnded = voiceSession.onEnded((end) =>
    onEnded(end, channelName(end) ?? callName),
  );
  const stopMuted = voiceSession.onModMuted(() =>
    showToast({ icon: MicOff, message: i18n.t('voice.modMutedToast') }),
  );
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status === prev.status || s.status === 'signed-in') return;
    void voiceSession.signOut();
    closeVoice();
    mediaDenied.setState({ mic: false, camera: false });
    voiceNotice.setState({ otherDevice: null });
  });
  const stopHome = homeStore.subscribe((s, prev) => {
    if (s.open !== prev.open && s.open) closeVoice();
  });
  const stopDm = dmView.subscribe((s, prev) => {
    if (s.open && s.open !== prev.open) closeVoice();
  });
  // S-ROOM-EDGE `mic-denied`: back from Settings, check again; granted → the button is just `off`.
  const recheck = (kind: 'mic' | 'camera') =>
    void (kind === 'mic' ? micPermission : cameraPermission)
      .check()
      .then((p) => {
        if (p.granted) mediaDenied.setState({ [kind]: false });
      });
  const app = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    if (ready) tryRejoin();
    const denied = mediaDenied.getState();
    if (denied.mic) recheck('mic');
    if (denied.camera) recheck('camera');
  });
  return () => {
    stopEvents();
    stopHomeNames();
    stopCall();
    clearInterval(alive);
    stopEnded();
    stopMuted();
    stopSession();
    stopHome();
    stopDm();
    app.remove();
  };
}
