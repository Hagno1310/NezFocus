import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

// SRS 7.3.5: Android channel "Nhắc học tập" for phase changes.
const STUDY_CHANNEL = 'study';
const ASKED_KEY = 'notifications.asked';

export type NotificationAccess = 'granted' | 'denied' | 'undetermined';

export const studyNotifications = {
  setupChannel: (name: string) =>
    Notifications.setNotificationChannelAsync(STUDY_CHANNEL, {
      name,
      importance: Notifications.AndroidImportance.HIGH,
    }),

  // SRS 7.3.6 step 3: every change cancels everything scheduled and schedules again.
  async replace(items: { at: Date; title: string; body: string }[]) {
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
  },

  // Android 13+ reports "denied" for a permission never asked yet; until we ask (and while the
  // system still lets us), that is "undetermined", not the S-STUDY-EDGE notif-denied state.
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
};
