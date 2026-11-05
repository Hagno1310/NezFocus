export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | Scheme;

export const resolveScheme = (
  preference: ThemePreference,
  system: Scheme | 'unspecified' | null | undefined,
): Scheme =>
  preference !== 'system'
    ? preference
    : system === 'light' || system === 'dark'
      ? system
      : 'dark';
