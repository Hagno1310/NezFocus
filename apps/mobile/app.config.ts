import type { ExpoConfig } from 'expo/config';

// DEC-02 / ADR-02: dev build + CNG. android/ is generated — configure native here or via plugins/.
// Android only for now (team decision 2026-10-16, pending SRS CR against DEC-01).
const config: ExpoConfig = {
  name: 'NezFocus',
  slug: 'nezfocus',
  scheme: 'nezfocus',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'app.nezfocus',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  platforms: ['android'],
  plugins: ['expo-dev-client'],
};

export default config;
