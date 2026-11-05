import '../shared/i18n';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setNavigationState } from '../domain/session/sessionStore';
import { fontFamily, useTheme, type Theme } from '../shared/theme';
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

export default function App() {
  const theme = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            linking={linking}
            theme={navigationTheme(theme)}
            onStateChange={setNavigationState}
          >
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
