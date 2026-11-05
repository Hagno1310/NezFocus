import { describe, expect, it } from 'vitest';
import { pickLanguage } from './pickLanguage';

describe('pickLanguage (NFR-I18N-01)', () => {
  it('follows the device when it is Vietnamese or English', () => {
    expect(pickLanguage(['en', 'vi'])).toBe('en');
    expect(pickLanguage(['vi'])).toBe('vi');
  });

  it('falls back to Vietnamese for any other device language', () => {
    expect(pickLanguage(['fr', 'en'])).toBe('vi');
    expect(pickLanguage([null])).toBe('vi');
  });
});
