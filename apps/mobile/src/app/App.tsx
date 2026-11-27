import '../shared/i18n';
import { studyNotifications } from '../data/notifications';
import { i18n } from '../shared/i18n';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type NavigationState,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authPrefs } from '../data/auth/authPrefs';
import { pendingInvites } from '../data/invites';
import { secureTokenStore } from '../data/auth/secureTokenStore';
import {
  persistSession,
  restoreSession,
} from '../domain/session/sessionPersistence';
import {
  sessionStore,
  setNavigationState,
  takeNavigationToRestore,
} from '../domain/session/sessionStore';
import { loadLastMethod } from '../features/auth/authFlowStore';
import { fontFamily, useTheme, type Theme } from '../shared/theme';
import { ToastHost } from '../shared/ui/Toast';
import { startMessagesLifecycle } from './messagesLifecycle';
import { startGatewayLifecycle } from './gatewayLifecycle';
import { startTypingLifecycle } from './typingLifecycle';
import { startUnreadLifecycle } from './unreadLifecycle';
import { startHomeLifecycle } from './homeLifecycle';
import { startPresenceLifecycle } from './presenceLifecycle';
import { startFriendsLifecycle } from './friendsLifecycle';
import { startDmLifecycle } from './dmLifecycle';
import { startSettingsLifecycle } from './settingsLifecycle';
import { startVoiceLifecycle } from './voiceLifecycle';
import { startRoomSessionLifecycle } from './roomSessionLifecycle';
import { startPushLifecycle } from './pushLifecycle';
import { interacted } from '../shared/interaction';
import { linking } from './navigation/linking';
import {
  RootNavigator,
  type RootStackParamList,
} from './navigation/RootNavigator';

const queryClient = new QueryClient();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// AUTH-04 AC5: back on the screen being viewed when the session ended. Waits a frame for the
// navigator to swap in the signed-in screens; skips a state whose routes no longer exist.
function watchNavigationRestore() {
  return sessionStore.subscribe((s, prev) => {
    if (s.status !== 'signed-in' || prev.status === 'signed-in') return;
    const state = takeNavigationToRestore() as NavigationState | undefined;
    if (!state) return;
    requestAnimationFrame(() => {
      const names = navigationRef.getRootState()?.routeNames ?? [];
      if (state.routes.every((r) => names.includes(r.name)))
        navigationRef.resetRoot(state);
    });
  });
}

// Spec 01 › Điều hướng sau khi vào được tài khoản: "Có lời mời đang chờ" comes before going back
// to the screen of an ended session, so it runs after watchNavigationRestore's frame.
function watchPendingInvite() {
  return sessionStore.subscribe((s, prev) => {
    if (s.status !== 'signed-in' || prev.status === 'signed-in') return;
    const invite = pendingInvites.current();
    if (!invite) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        navigationRef.navigate('Invite', {
          code: invite.code,
          channel: invite.channel,
        }),
      ),
    );
  });
}

// AUTH-07 AC2: nothing of the last account stays cached once signed out (log out or a session
// that ended). The Gateway stops in gatewayLifecycle; the tokens go in the logout call.
function clearCacheOnSignOut() {
  return sessionStore.subscribe((s, prev) => {
    if (s.status === 'signed-out' && prev.status !== 'signed-out')
      queryClient.clear();
  });
}

function navigationTheme({ scheme, colors }: Theme): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const face = (fontWeight: '400' | '500' | '600' | '700') => ({
    fontFamily: fontFamily.text,
    fontWeight,
  });
  return {
    dark: scheme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors['surface-1'],
      text: colors['text-primary'],
      border: colors.border,
      notification: colors.danger,
    },
    fonts: {
      ...base.fonts,
      regular: face('400'),
      medium: face('500'),
      bold: face('600'),
      heavy: face('700'),
    },
  };
}

// Read before the first render so a signed-in user never sees Welcome flash by.
const sessionRestored = Promise.all([
  restoreSession({
    saved: authPrefs.savedSession,
    hasTokens: async () => !!(await secureTokenStore.get()),
  }),
  loadLastMethod(),
  // REQ-SRV-07 AC4 / AC5: an invite kept before the app was killed (dropped after 24 hours).
  pendingInvites.restore().catch(() => {}),
]).then(() =>
  persistSession((s) => void authPrefs.saveSession(s).catch(() => {})),
);

export default function App() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void sessionRestored.then(() => setReady(true));
  }, []);
  // Before the Gateway starts, so READY reaches the Home tab.
  useEffect(startHomeLifecycle, []);
  useEffect(startPresenceLifecycle, []);
  useEffect(startFriendsLifecycle, []);
  useEffect(startDmLifecycle, []);
  useEffect(startSettingsLifecycle, []);
  useEffect(startMessagesLifecycle, []);
  // Before the Gateway: READY.voice_states must find its listener.
  useEffect(startVoiceLifecycle, []);
  useEffect(startRoomSessionLifecycle, []);
  useEffect(startGatewayLifecycle, []);
  useEffect(startTypingLifecycle, []);
  useEffect(startUnreadLifecycle, []);
  useEffect(watchNavigationRestore, []);
  useEffect(watchPendingInvite, []);
  useEffect(clearCacheOnSignOut, []);
  // REQ-NOTIF-02: token, channels, and where a tapped push leads.
  useEffect(
    () =>
      startPushLifecycle({
        ready: () =>
          navigationRef.isReady() &&
          (navigationRef.getRootState()?.routeNames ?? []).includes('Main'),
        showHome: () =>
          navigationRef.navigate('Main', {
            screen: 'Home',
            params: { screen: 'HomeRoot' },
          }),
        openFriendRequests: () =>
          navigationRef.navigate('Main', {
            screen: 'Home',
            params: {
              screen: 'Friends',
              params: { tab: 'pending', at: Date.now() },
            },
          }),
      }),
    [],
  );
  // REQ-STUDY-10 / SRS 7.3.5: the "Nhắc học tập" channel exists from launch.
  useEffect(() => {
    void studyNotifications
      .setupChannel(i18n.t('study.alerts.channel'))
      .catch(() => undefined);
  }, []);
  return (
    // REQ-AUTH-05 AC1: any touch anywhere restarts the 10 idle minutes (bubbles up, never claims it).
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={interacted}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            theme={navigationTheme(theme)}
            onStateChange={setNavigationState}
          >
            {ready && <RootNavigator />}
          </NavigationContainer>
          <ToastHost />
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
