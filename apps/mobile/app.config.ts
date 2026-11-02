import type { ExpoConfig } from 'expo/config';

// DEC-02 / ADR-02: dev build + CNG. android/ is generated — configure native here or via plugins/.
// Android only (SRS v1.3, DEC-30).
const config: ExpoConfig = {
  name: 'NezFocus',
  slug: 'nezfocus',
  owner: 'hagnovn',
  scheme: 'nezfocus',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'app.nezfocus',
    adaptiveIcon: {
      backgroundColor: '#547FE4',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  platforms: ['android'],
  plugins: ['expo-dev-client'],
  // EAS project @hagnovn/nezfocus — shared by the team and CI.
  extra: { eas: { projectId: 'b3823344-a088-479a-a6d6-39e10015445f' } },
};

export default config;
