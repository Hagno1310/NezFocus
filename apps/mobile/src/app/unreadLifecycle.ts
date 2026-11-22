import * as Notifications from 'expo-notifications';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { concernsMe } from '../domain/messages/mentions';
import { reduceUnread, totals, unreadStore } from '../domain/messages/unread';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';

// REQ-NOTIF-01: unread / mention state from READY, MESSAGE_CREATE and MESSAGE_ACK, and the
// app icon badge (mentions + unread DMs; Android launchers that support it).
// ponytail: khi cần badge trước READY (mở app khi offline): lưu vào bảng read_states cục bộ (8.7).
export function startUnreadLifecycle() {
  const stopEvents = onGatewayEvent((event) => {
    if (
      event.t !== 'READY' &&
      event.t !== 'MESSAGE_CREATE' &&
      event.t !== 'MESSAGE_ACK'
    )
      return;
    const myId = sessionStore.getState().user?.id ?? '';
    unreadStore.setState(
      (s) =>
        reduceUnread(
          s,
          event.t === 'READY'
            ? { t: 'READY', read_states: event.d.read_states }
            : event,
          {
            myId,
            // Roles of a server whose detail is not loaded yet count from the next READY.
            concerns: (m) =>
              m.server_id !== null &&
              concernsMe(
                m,
                myId,
                homeStore.getState().myRoleIds[m.server_id] ?? [],
              ),
          },
        ),
      true,
    );
  });

  let badge = 0;
  const stopBadge = unreadStore.subscribe((s) => {
    const n = totals(s).home;
    if (n === badge) return;
    badge = n;
    void Notifications.setBadgeCountAsync(n).catch(() => {});
  });

  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status === 'signed-out' && prev.status !== 'signed-out')
      unreadStore.setState({}, true);
  });

  return () => {
    stopEvents();
    stopBadge();
    stopSession();
  };
}
