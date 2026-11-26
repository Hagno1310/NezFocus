import { AppState } from 'react-native';
import { voiceSession } from '../data/voice';
import { micPermission } from '../data/voice/micPermission';
import { dmView } from '../domain/dm/dmStore';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';
import {
  voiceStore,
  type VoiceEnd,
  type VoiceTarget,
} from '../domain/voice/voiceSession';
import { closeVoice, voiceView } from '../domain/voice/voiceView';
import { micDenied } from '../domain/voice/micDenied';
import { i18n } from '../shared/i18n';
import { showToast } from '../shared/ui/Toast';

const channelName = ({ serverId, channelId }: VoiceTarget) =>
  homeStore.getState().channels[serverId]?.find((c) => c.id === channelId)
    ?.name;

// CR-28 #30: what my seat ending by the backend looks like. Kick / ban / leaving the server have
// their own screens (02 S-HOME-EDGE); P3-B1.5 / B1.6 add `other_device` / `disconnected_by_mod`.
function onEnded(end: VoiceEnd, name: string | undefined) {
  if (end.reason !== 'channel_deleted') return;
  if (voiceView.getState().open?.channelId === end.channelId) closeVoice();
  // chốt 26/11/2026 (P3-B1): back to the screen before + "{phòng} không còn khả dụng".
  if (name) showToast({ message: i18n.t('voice.gone', { name }) });
}

// REQ-VC-01: seats from READY / VOICE_STATE_UPDATE, my call ends with the session.
export function startVoiceLifecycle() {
  // The channel may already be gone from the drawer when its VOICE_STATE_UPDATE comes.
  let callName: string | undefined;
  const stopEvents = onGatewayEvent(voiceSession.apply);
  const remember = () => {
    const call = voiceStore.getState().call;
    if (call) callName = channelName(call) ?? callName;
  };
  const stopHomeNames = homeStore.subscribe(remember);
  const stopCallNames = voiceStore.subscribe(remember);
  const stopEnded = voiceSession.onEnded((end) =>
    onEnded(end, channelName(end) ?? callName),
  );
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status === prev.status || s.status === 'signed-in') return;
    void voiceSession.signOut();
    closeVoice();
    micDenied.setState({ denied: false });
  });
  const stopHome = homeStore.subscribe((s, prev) => {
    if (s.open !== prev.open && s.open) closeVoice();
  });
  const stopDm = dmView.subscribe((s, prev) => {
    if (s.open && s.open !== prev.open) closeVoice();
  });
  // S-ROOM-EDGE `mic-denied`: back from Settings, check again; granted → the Mic is just `off`.
  const app = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || !micDenied.getState().denied) return;
    void micPermission.check().then((p) => {
      if (p.granted) micDenied.setState({ denied: false });
    });
  });
  return () => {
    stopEvents();
    stopHomeNames();
    stopCallNames();
    stopEnded();
    stopSession();
    stopHome();
    stopDm();
    app.remove();
  };
}
