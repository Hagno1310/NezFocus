import { AVATAR_SIZES } from '@nezfocus/shared';
import decodeHeic from 'heic-decode';
import sharp from 'sharp';

const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'mif1',
  'msf1',
]);

// NFR-SEC-04 / SRS 11.1 40014: the type comes from the bytes, never from the name or the
// declared Content-Type.
export function detectImageType(buf: Buffer): string | undefined {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'image/png';
  if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'image/webp';
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('latin1');
    if (HEIF_BRANDS.has(brand)) return 'image/heic';
  }
  return undefined;
}

export type AvatarImage = {
  width: number;
  height: number;
  variants: { size: (typeof AVATAR_SIZES)[number]; body: Buffer }[];
};

// REQ-AUTH-06: webp at 128 / 256 / 512, cropped square from the middle (the app already
// crops; this only guards against a non-square upload). sharp writes no metadata unless
// asked, so EXIF (and its GPS) never reaches the stored files. Throws on bytes it cannot
// decode.
export async function avatarVariants(
  buf: Buffer,
  type: string,
): Promise<AvatarImage> {
  // sharp's own HEIF support only covers AV1; iPhone photos are HEVC.
  const source =
    type === 'image/heic'
      ? await decodeHeic({ buffer: buf }).then(({ width, height, data }) =>
          sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }),
        )
      : sharp(buf);
  // One decoded, upright copy (EXIF orientation applied) to cut the three sizes from.
  const oriented = sharp(await source.rotate().png().toBuffer());
  const { width = 0, height = 0 } = await oriented.metadata();
  const variants = await Promise.all(
    AVATAR_SIZES.map(async (size) => ({
      size,
      body: await oriented
        .clone()
        .resize(size, size, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer(),
    })),
  );
  return { width, height, variants };
}
