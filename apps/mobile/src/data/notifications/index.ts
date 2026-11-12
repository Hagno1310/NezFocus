import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SRS 7.3.5: Android channel "Nhắc học tập" for phase changes.
const STUDY_CHANNEL = 'study';
const ASKED_KEY = 'notifications.asked';

export type NotificationAccess = 'granted' | 'denied' | 'undetermined';

type Alarm = { at: Date; title: string; body: string };

let queue: Promise<void> = Promise.resolve();

async function schedule(items: Alarm[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const { at, title, body } of items)
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { open: 'solo' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: STUDY_CHANNEL,
      },
    });
}

export const studyNotifications = {
  setupChannel: (name: string) =>
    Notifications.setNotificationChannelAsync(STUDY_CHANNEL, {
      name,
      importance: Notifications.AndroidImportance.HIGH,
    }),

  // SRS 7.3.6 step 3: cancel all, schedule again; queued so close updates never interleave.
  replace(items: Alarm[]) {
    queue = queue.then(() => schedule(items)).catch(() => undefined);
    return queue;
  },

  // Android 13+ says "denied" before we ever asked; that is "undetermined", not notif-denied.
  async access(): Promise<NotificationAccess> {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (granted) return 'granted';
    const asked = (await SecureStore.getItemAsync(ASKED_KEY)) === '1';
    return canAskAgain && !asked ? 'undetermined' : 'denied';
  },

  async request(): Promise<boolean> {
    await SecureStore.setItemAsync(ASKED_KEY, '1');
    return (await Notifications.requestPermissionsAsync()).granted;
  },

  // S-ROOM-09: the explanation shows once, whether the user allowed or chose "Để sau".
  markAsked: () => SecureStore.setItemAsync(ASKED_KEY, '1'),

  // Android 12+ "Báo thức và lời nhắc"; without it alarms fire a few minutes late.
  exactAlarm: async () =>
    (await Notifications.getExactAlarmPermissionsAsync()).granted,
  openExactAlarmSettings: () =>
    Notifications.requestExactAlarmPermissionsAsync().catch(() => undefined),

  // S-ME-05 "Mở cài đặt" / "Âm thanh và rung": the app's notification page (its channels);
  // the app's details page if this Android has no such page.
  openAppSettings: () =>
    Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
      {
        key: 'android.provider.extra.APP_PACKAGE',
        value: Constants.expoConfig?.android?.package ?? 'app.nezfocus',
      },
    ]).catch(() => Linking.openSettings()),
};
