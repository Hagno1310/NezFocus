import { describe, expect, it } from 'vitest';
import { badgeText, initial, stackAvatars } from './logic';

describe('badgeText (C-13 Badge, C-03)', () => {
  it('shows 1–99 as is and caps at 99+', () => {
    expect(badgeText(1)).toBe('1');
    expect(badgeText(12)).toBe('12');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(100)).toBe('99+');
  });

  it('hides the badge at zero', () => {
    expect(badgeText(0)).toBeNull();
  });
});

describe('initial (C-13 Avatar without a photo)', () => {
  it('takes the first letter of the display name, uppercased', () => {
    expect(initial('an Nguyễn')).toBe('A');
  });

  it('keeps a Vietnamese letter with its marks', () => {
    expect(initial('Ánh')).toBe('Á');
    expect(initial('đức')).toBe('Đ');
  });

  it('skips leading spaces and survives an empty name', () => {
    expect(initial('  Bình')).toBe('B');
    expect(initial('')).toBe('?');
  });
});

describe('stackAvatars (C-13 chồng avatar)', () => {
  it('shows at most 3, then +N', () => {
    expect(stackAvatars(['An', 'Bình', 'Chi', 'Dũng', 'Em'])).toEqual({
      shown: ['An', 'Bình', 'Chi'],
      more: 2,
    });
  });

  it('no +N when everyone fits', () => {
    expect(stackAvatars(['An', 'Bình'])).toEqual({
      shown: ['An', 'Bình'],
      more: 0,
    });
  });
});
