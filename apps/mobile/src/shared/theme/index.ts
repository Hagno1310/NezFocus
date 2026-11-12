import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { resolveScheme, type Scheme, type ThemePreference } from './scheme';
import { darkColors, lightColors, type Colors } from './tokens';

export * from './tokens';
export type { Scheme, ThemePreference };

// SRS 3.3: kept on the phone and in user_settings.theme by data/settings `appearance` (S-ME-06).
export const useThemePreference = create<{
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}>((set) => ({
  preference: 'system',
  setPreference: (preference) => set({ preference }),
}));

export type Theme = { scheme: Scheme; colors: Colors };

export function useTheme(): Theme {
  const system = useColorScheme();
  const preference = useThemePreference((s) => s.preference);
  const scheme = resolveScheme(preference, system);
  return { scheme, colors: scheme === 'dark' ? darkColors : lightColors };
}
