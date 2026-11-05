import { describe, expect, it } from 'vitest';
import { drawerGesture } from './drawerGesture';

const closed = { leftOpen: false, rightOpen: false };

describe('drawerGesture (SRS 3.1 › Cử chỉ)', () => {
  it('closed drawers only start on the swipe that opens them', () => {
    // left drawer opens on a right swipe → fails when the finger moves left
    expect(drawerGesture('left', closed)).toEqual({
      swipeEnabled: true,
      failOffsetX: -3,
    });
    expect(drawerGesture('right', closed)).toEqual({
      swipeEnabled: true,
      failOffsetX: 3,
    });
  });

  it('an open drawer only starts on the swipe that closes it', () => {
    expect(
      drawerGesture('left', { leftOpen: true, rightOpen: false }).failOffsetX,
    ).toBe(3);
    expect(
      drawerGesture('right', { leftOpen: false, rightOpen: true }).failOffsetX,
    ).toBe(-3);
  });

  it('the other drawer cannot be swiped while one is open', () => {
    expect(
      drawerGesture('left', { leftOpen: false, rightOpen: true }).swipeEnabled,
    ).toBe(false);
    expect(
      drawerGesture('right', { leftOpen: true, rightOpen: false }).swipeEnabled,
    ).toBe(false);
  });
});
