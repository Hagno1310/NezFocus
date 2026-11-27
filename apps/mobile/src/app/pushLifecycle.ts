import { AppState } from 'react-native';
import {
  onNotificationTap,
  pushChannels,
  pushDevice,
  remotePushTokens,
} from '../data/push';
import { dmStore } from '../domain/dm/dmStore';
import { startPushRegistration } from '../domain/push/pushRegistration';
import { pushTarget, type PushTarget } from '../domain/push/pushTarget';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';
import { openMessageLink } from '../features/chat/openMessageLink';
import { i18n } from '../shared/i18n';

export type PushNavigation = {
  ready(): boolean;
  showHome(): void; // the Home tab at its root, where the opened channel / DM shows
  openFriendRequests(): void; // S-DM-04 `pending`
};

const READY_WAIT_MS = 15_000;

const until = (ok: () => boolean, ms: number) =>
  new Promise<void>((resolve) => {
    const start = Date.now();
    const tick = () =>
      ok() || Date.now() - start > ms ? resolve() : setTimeout(tick, 100);
    tick();
  });

// A tap on a push that started the app comes before the navigator and READY: wait for the
// drawer's servers (a channel) or the DM list (a DM) before opening, as a tapped row would.
async function open(target: PushTarget, nav: PushNavigation) {
  const loaded = () => {
    if (target.kind !== 'link') return true;
    return target.link.kind === 'channel'
      ? homeStore.getState().servers !== null
      : dmStore.getState().loaded;
  };
  await until(
    () =>
      sessionStore.getState().status === 'signed-in' && nav.ready() && loaded(),
    READY_WAIT_MS,
  );
  if (sessionStore.getState().status !== 'signed-in' || !nav.ready()) return;
  if (target.kind === 'friend-requests') return nav.openFriendRequests();
  // REQ-NOTIF-02 AC3: the message in view with `highlight`; a deleted one → Toast (REQ-MSG-05).
  if ((await openMessageLink(target.link)) === 'opened') nav.showHome();
}

// REQ-NOTIF-02 on the phone: channels, the device token, and where a tap leads.
export function startPushLifecycle(nav: PushNavigation) {
  const setupChannels = () =>
    void pushChannels
      .setup({
        messages: i18n.t('push.channels.messages'),
        calls: i18n.t('push.channels.calls'),
        roomRunning: i18n.t('voice.service.channel'),
      })
      .catch(() => {});
  setupChannels();
  i18n.on('languageChanged', setupChannels);

  const stopRegistration = startPushRegistration({
    device: pushDevice,
    repo: remotePushTokens,
    session: sessionStore,
    onForeground: (cb) => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') cb();
      });
      return () => sub.remove();
    },
  });

  const stopTaps = onNotificationTap((data, done) => {
    const target = pushTarget(data);
    if (!target) return; // a Solo alert: useOpenSoloFromNotification's
    done();
    void open(target, nav);
  });

  return () => {
    i18n.off('languageChanged', setupChannels);
    stopRegistration();
    stopTaps();
  };
}
