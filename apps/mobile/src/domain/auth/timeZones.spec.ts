import { describe, expect, it } from 'vitest';
import {
  gmtLabel,
  searchTimeZones,
  timeZoneOptions,
  zoneOffsetMinutes,
} from './timeZones';

const NOW = new Date('2026-10-18T14:47:00Z');

describe('time zones (S-ONB-01 › timezone-picker)', () => {
  it('reads the offset of a zone at a given moment', () => {
    expect(zoneOffsetMinutes('Asia/Ho_Chi_Minh', NOW)).toBe(420);
    expect(zoneOffsetMinutes('Asia/Kolkata', NOW)).toBe(330);
    expect(zoneOffsetMinutes('America/Sao_Paulo', NOW)).toBe(-180);
  });

  it('prints GMT with hours, and minutes only when needed', () => {
    expect(gmtLabel(420)).toBe('GMT+7');
    expect(gmtLabel(330)).toBe('GMT+5:30');
    expect(gmtLabel(-180)).toBe('GMT-3');
    expect(gmtLabel(0)).toBe('GMT+0');
  });

  it('sorts by GMT ascending, then city name; Vietnamese city names in vi', () => {
    const options = timeZoneOptions(
      ['Asia/Tokyo', 'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Etc/GMT+3', 'UTC'],
      NOW,
      'vi',
    );
    expect(options.map((o) => o.label)).toEqual([
      'GMT+7 · Bangkok',
      'GMT+7 · Hồ Chí Minh',
      'GMT+9 · Tokyo',
    ]);
    expect(timeZoneOptions(['Asia/Ho_Chi_Minh'], NOW, 'en')[0]?.label).toBe(
      'GMT+7 · Ho Chi Minh',
    );
  });

  it('search ignores accents and case, and matches GMT', () => {
    const options = timeZoneOptions(
      ['Asia/Tokyo', 'Asia/Ho_Chi_Minh', 'Asia/Bangkok'],
      NOW,
      'vi',
    );
    expect(searchTimeZones(options, 'ho chi').map((o) => o.id)).toEqual([
      'Asia/Ho_Chi_Minh',
    ]);
    expect(searchTimeZones(options, 'gmt+9').map((o) => o.id)).toEqual([
      'Asia/Tokyo',
    ]);
    expect(searchTimeZones(options, 'Atlantis')).toEqual([]);
    expect(searchTimeZones(options, '  ')).toHaveLength(3);
  });
});
