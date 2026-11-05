import { describe, expect, it } from 'vitest';
import { resolveScheme } from './scheme';

describe('resolveScheme', () => {
  it('follows the system by default (SRS 3.3, NFR-MOB-14)', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
  });

  it('falls back to dark when the system reports nothing (dark leads, DESIGN.md › Theme)', () => {
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', undefined)).toBe('dark');
  });

  it('an explicit choice wins over the system', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
