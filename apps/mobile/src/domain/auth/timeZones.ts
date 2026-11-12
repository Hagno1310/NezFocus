// S-ONB-01 › timezone-picker: "GMT+7 · Hồ Chí Minh", sorted by GMT then city, searchable
// without accents. IANA ids come from the platform (Intl), see features/auth/timeZoneList.ts.
export type TimeZoneOption = {
  id: string;
  offset: number; // minutes east of UTC at the moment the list was built
  city: string;
  label: string;
};

// IANA city names are English; only the ones Vietnamese users read differently are mapped.
const VI_CITIES: Record<string, string> = {
  'Asia/Ho_Chi_Minh': 'Hồ Chí Minh',
};
// Spec 07 S-ME-06 `english`: "GMT+7 · Ho Chi Minh City".
const EN_CITIES: Record<string, string> = {
  'Asia/Ho_Chi_Minh': 'Ho Chi Minh City',
};

export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const local = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
  );
  const utc = Math.floor(at.getTime() / 60_000) * 60_000;
  return Math.round((local - utc) / 60_000);
}

export function gmtLabel(offset: number): string {
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const minutes = abs % 60;
  return `GMT${sign}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

export const cityName = (id: string, lang: 'vi' | 'en') =>
  (lang === 'vi' ? VI_CITIES[id] : EN_CITIES[id]) ||
  (id.split('/').pop() ?? id).replace(/_/g, ' ');

export const zoneLabel = (id: string, at: Date, lang: 'vi' | 'en') =>
  `${gmtLabel(zoneOffsetMinutes(id, at))} · ${cityName(id, lang)}`;

// Region/City zones only: "Etc/GMT+3" and "UTC" have no city to show.
export function timeZoneOptions(
  ids: readonly string[],
  at: Date,
  lang: 'vi' | 'en',
): TimeZoneOption[] {
  return ids
    .filter((id) => id.includes('/') && !id.startsWith('Etc/'))
    .map((id) => {
      const offset = zoneOffsetMinutes(id, at);
      const city = cityName(id, lang);
      return { id, offset, city, label: `${gmtLabel(offset)} · ${city}` };
    })
    .sort((a, b) => a.offset - b.offset || a.city.localeCompare(b.city, lang));
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function searchTimeZones(
  options: readonly TimeZoneOption[],
  query: string,
): TimeZoneOption[] {
  const q = fold(query);
  if (!q) return [...options];
  return options.filter((o) =>
    [o.city, o.id.replace(/_/g, ' '), gmtLabel(o.offset)].some((s) =>
      fold(s).includes(q),
    ),
  );
}
