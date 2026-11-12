// 07 S-ME-01 `crop` (avatars and server icons).
// The photo is shown covering a D×D square (the circle's box) at `scale` ≥ 1 on top of the
// fit, its centre moved by (x, y) display px. Worklet-safe: also runs on the UI thread.

type Size = { width: number; height: number };

const displayScale = (img: Size, side: number, scale: number) => {
  'worklet';
  return (side / Math.min(img.width, img.height)) * scale;
};

// How far the centre may move before an edge of the photo enters the circle's box.
export function clampOffset(
  img: Size,
  side: number,
  scale: number,
  x: number,
  y: number,
) {
  'worklet';
  const k = displayScale(img, side, scale);
  const maxX = (img.width * k - side) / 2;
  const maxY = (img.height * k - side) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)) || 0,
    y: Math.min(maxY, Math.max(-maxY, y)) || 0,
  };
}

// The square of the photo (in its own pixels) that sits inside the circle's box.
export function cropRect(
  img: Size,
  side: number,
  scale: number,
  x: number,
  y: number,
) {
  const k = displayScale(img, side, scale);
  const at = clampOffset(img, side, scale, x, y);
  const size = Math.min(Math.round(side / k), img.width, img.height);
  const left = (img.width * k) / 2 - side / 2 - at.x;
  const top = (img.height * k) / 2 - side / 2 - at.y;
  const clamp = (v: number, max: number) =>
    Math.min(max - size, Math.max(0, Math.round(v / k)));
  return {
    originX: clamp(left, img.width),
    originY: clamp(top, img.height),
    width: size,
    height: size,
  };
}
