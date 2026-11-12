import { describe, expect, it } from 'vitest';
import { clampOffset, cropRect } from './crop';

describe('cropRect / clampOffset (07 S-ME-01 crop)', () => {
  it('unmoved, a landscape photo is cut in the middle at its full height', () => {
    expect(cropRect({ width: 4000, height: 3000 }, 300, 1, 0, 0)).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
    });
  });

  it('zoomed ×2 and dragged right, the square moves left and halves', () => {
    // display scale 0.1 × 2 = 0.2 px per image px; +100 px drag = 500 image px.
    expect(cropRect({ width: 4000, height: 3000 }, 300, 2, 100, 0)).toEqual({
      originX: 750,
      originY: 750,
      width: 1500,
      height: 1500,
    });
  });

  it('the image never leaves a gap inside the circle', () => {
    // At ×1 the 400×300 display can move 50 px sideways and not at all up or down.
    expect(clampOffset({ width: 4000, height: 3000 }, 300, 1, 80, -20)).toEqual(
      { x: 50, y: 0 },
    );
  });
});
