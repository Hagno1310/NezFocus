import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { pickLanguage, type Language } from './pickLanguage';
import { vi } from './vi';

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: pickLanguage(getLocales().map((l) => l.languageCode)),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false }, // React already escapes
});

// Kept on the phone and in user_settings.locale by data/settings `appearance` (S-ME-06).
export const setLanguage = (lng: Language) => i18n.changeLanguage(lng);
export const currentLanguage = () => i18n.language as Language;

export { i18n };
export type { Language };
