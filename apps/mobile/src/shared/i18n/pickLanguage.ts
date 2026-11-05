export type Language = 'vi' | 'en';

// NFR-I18N-01: before sign-in follow the device's first language if it is vi/en, otherwise vi.
export function pickLanguage(deviceLanguages: (string | null)[]): Language {
  return deviceLanguages[0] === 'en' ? 'en' : 'vi';
}
