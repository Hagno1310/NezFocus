import { PushChannel, PushTokenRoutes } from '@nezfocus/shared';
import * as Notifications from 'expo-notifications';
import type {
  PushDevice,
  PushTokenRepository,
} from '../../domain/push/pushRegistration';
import { api } from '../api';

// CR-28 #35: FCM through expo-notifications (no @react-native-firebase/messaging).
export const pushDevice: PushDevice = {
  token: async () => {
    const { data } = await Notifications.getDevicePushTokenAsync();
    return typeof data === 'string' ? data : null;
  },
  onTokenChange: (cb) => {
    const sub = Notifications.addPushTokenListener(({ data }) => {
      if (typeof data === 'string') cb(data);
    });
    return () => sub.remove();
  },
  forget: () => Notifications.unregisterForNotificationsAsync(),
};

export const remotePushTokens: PushTokenRepository = {
  register: async (token) => {
    await api.request(PushTokenRoutes.register, {
      method: 'PUT',
      body: { token, kind: 'fcm' },
    });
  },
};

// SRS 7.3.5: "Phòng học đang chạy" is the voice service's, made here too so all four channels
// show in the system settings from launch (S-ME-05 `android-settings`).
export const pushChannels = {
  setup: (names: { messages: string; calls: string; roomRunning: string }) =>
    Promise.all([
      Notifications.setNotificationChannelAsync(PushChannel.enum.messages, {
        name: names.messages,
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync(PushChannel.enum.calls, {
        name: names.calls,
        importance: Notifications.AndroidImportance.MAX,
      }),
      Notifications.setNotificationChannelAsync(
        PushChannel.enum['room-running'],
        {
          name: names.roomRunning,
          importance: Notifications.AndroidImportance.LOW,
        },
      ),
    ]),
};

// Once each: the tap that started the app, then those while it runs. A notification message
// tapped from a killed app may carry its data only on the remote message.
export function onNotificationTap(
  cb: (data: unknown, done: () => void) => void,
) {
  const seen = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    )
      return;
    const n = response.notification;
    const key = `${n.request.identifier}:${n.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    const trigger = n.request.trigger as {
      remoteMessage?: { data?: Record<string, string> };
    } | null;
    cb(
      { ...trigger?.remoteMessage?.data, ...n.request.content.data },
      () =>
        void Notifications.clearLastNotificationResponseAsync().catch(() => {}),
    );
  };
  void Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
