import '../shared/i18n';
import { studyNotifications } from '../data/notifications';
import { i18n } from '../shared/i18n';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authPrefs } from '../data/auth/authPrefs';
import { secureTokenStore } from '../data/auth/secureTokenStore';
import {
  persistSession,
  restoreSession,
} from '../domain/session/sessionPersistence';
import { setNavigationState } from '../domain/session/sessionStore';
import { loadLastMethod } from '../features/auth/authFlowStore';
import { fontFamily, useTheme, type Theme } from '../shared/theme';
import { ToastHost } from '../shared/ui/Toast';
import { startGatewayLifecycle } from './gatewayLifecycle';
import { linking } from './navigation/linking';
import { RootNavigator } from './navigation/RootNavigator';

const queryClient = new QueryClient();

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
]).then(() =>
  persistSession((s) => void authPrefs.saveSession(s).catch(() => {})),
);

export default function App() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void sessionRestored.then(() => setReady(true));
  }, []);
  useEffect(startGatewayLifecycle, []);
  // REQ-STUDY-10 / SRS 7.3.5: the "Nhắc học tập" channel exists from launch.
  useEffect(() => {
    void studyNotifications
      .setupChannel(i18n.t('study.alerts.channel'))
      .catch(() => undefined);
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
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
