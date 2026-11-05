import type { ExpoConfig } from 'expo/config';

// DEC-02 / ADR-02: dev build + CNG. android/ is generated — configure native here or via plugins/.
// Android only (SRS v1.3, DEC-30).

// DESIGN.md › Typography: weights in use. One family per font so `fontWeight` picks the face;
// the names must match `fontFamily` in src/shared/theme/tokens.ts.
const googleFont = (
  pkg: string,
  file: string,
  weights: [number, string][],
) => ({
  fontFamily: file.replace(/([a-z])([A-Z])/g, '$1 $2'),
  fontDefinitions: weights.map(([weight, name]) => ({
    path: require.resolve(
      `@expo-google-fonts/${pkg}/${weight}${name}/${file}_${weight}${name}.ttf`,
    ),
    weight,
  })),
});
const beVietnamPro = googleFont('be-vietnam-pro', 'BeVietnamPro', [
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'SemiBold'],
  [700, 'Bold'],
  [800, 'ExtraBold'],
]);
const unbounded = googleFont('unbounded', 'Unbounded', [
  [500, 'Medium'],
  [600, 'SemiBold'],
]);
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
    // NFR-MOB-14: predictive back preview on Android 14+.
    predictiveBackGestureEnabled: true,
  },
  platforms: ['android'],
  plugins: [
    'expo-dev-client',
    'expo-localization',
    'expo-secure-store',
    ['expo-font', { android: { fonts: [beVietnamPro, unbounded] } }],
  ],
  // EAS project @hagnovn/nezfocus — shared by the team and CI.
  extra: { eas: { projectId: 'b3823344-a088-479a-a6d6-39e10015445f' } },
};

export default config;
