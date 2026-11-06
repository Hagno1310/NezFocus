import * as Notifications from 'expo-notifications';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import {
  studyNotifications,
  type NotificationAccess,
} from '../../../data/notifications';
import type { SoloSnapshot } from '../../../domain/study/solo';
import { soloAlerts } from '../../../domain/study/soloAlerts';

// SRS 7.3.6 step 3: any change of the session (each SOLO_SESSION_UPDATE lands here) reschedules.
export function useSoloAlertSchedule(snap: SoloSnapshot | null) {
  const { t } = useTranslation();
  // Back from settings: alarms set without the exact-alarm permission stay inexact unless redone.
  const [returns, setReturns] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setReturns((n) => n + 1);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const items = (snap ? soloAlerts(snap, new Date()) : []).map((a) => ({
      at: a.at,
      title: t('study.solo'),
      body:
        a.kind === 'solo-waiting'
          ? t('study.alerts.waiting')
          : t(
              a.kind === 'to-long-break'
                ? 'study.alerts.toLongBreak'
                : 'study.alerts.toBreak',
              { minutes: a.minutes },
            ),
    }));
    void studyNotifications.replace(items).catch(() => undefined);
  }, [snap, t, returns]);
}

// Re-read on return to the app: the user may have changed it in system settings meanwhile.
export function useNotificationAccess() {
  const [state, setState] = useState<{
    access: NotificationAccess;
    exactAlarm: boolean;
  } | null>(null);
  useEffect(() => {
    const read = async () =>
      setState({
        access: await studyNotifications.access(),
        exactAlarm: await studyNotifications.exactAlarm().catch(() => true),
      });
    void read();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void read();
    });
    return () => sub.remove();
  }, []);
  return state;
}

// STUDY-10 AC1: tapping a Solo notification opens S-STUDY-02 (cold start included).
export function useOpenSoloFromNotification(open: () => void) {
  const response = Notifications.useLastNotificationResponse();
  const onOpen = useEffectEvent(open);
  // A response is handled once; clearing it is async and the tab bar re-renders meanwhile.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const n = response?.notification;
    if (n?.request.content.data?.open !== 'solo') return;
    const key = `${n.request.identifier}:${n.date}`;
    if (handled.current === key) return;
    handled.current = key;
    onOpen();
    void Notifications.clearLastNotificationResponseAsync();
  }, [response]);
}
