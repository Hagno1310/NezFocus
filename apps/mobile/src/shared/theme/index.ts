import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { resolveScheme, type Scheme, type ThemePreference } from './scheme';
import { darkColors, lightColors, type Colors } from './tokens';

export * from './tokens';
export type { Scheme, ThemePreference };

// ponytail: not persisted yet; Cá nhân › Giao diện (P1-A5) saves it to user_settings.
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
