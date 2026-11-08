import { getCalendars } from 'expo-localization';

// S-ONB-01 time zones come from the platform's ICU data (Intl). Older Hermes builds lack
// Intl.supportedValuesOf, so a short list of common zones stands in.
const FALLBACK = [
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Atlantic/Azores',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Cairo',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function availableTimeZones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones?.length) return zones;
  } catch {
    // fall through
  }
  return FALLBACK;
}

export const deviceTimeZone = () =>
  getCalendars()[0]?.timeZone ??
  Intl.DateTimeFormat().resolvedOptions().timeZone ??
  'Asia/Ho_Chi_Minh';
