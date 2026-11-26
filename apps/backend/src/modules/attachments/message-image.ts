import { MESSAGE_ATTACHMENT_TYPES } from '@nezfocus/shared';
import sharp, { type Sharp } from 'sharp';

// CR-28 #29: the longer side of the thumbnail the chat shows first (NFR-MOB-07).
export const THUMBNAIL_SIDE = 720;

// REQ-MSG-04 (CR-28): each image type MVP takes, its file extension and how it is written
// again (sharp keeps no metadata unless asked).
const FORMATS: Record<
  (typeof MESSAGE_ATTACHMENT_TYPES)[number],
  { ext: string; write: (img: Sharp) => Sharp }
> = {
  'image/jpeg': {
    ext: 'jpg',
    write: (img) => img.jpeg({ quality: 90, mozjpeg: true }),
  },
  'image/png': { ext: 'png', write: (img) => img.png() },
  'image/webp': { ext: 'webp', write: (img) => img.webp({ quality: 90 }) },
  'image/gif': { ext: 'gif', write: (img) => img.gif() },
};

export type MessageImage = {
  original: Buffer;
  ext: string;
  width: number;
  height: number;
  thumbnail: Buffer;
};

// REQ-MSG-04, CR-28 #29: the original is written again upright in its own format; sharp keeps
// no metadata unless asked, so EXIF (and its GPS) never reaches storage. A GIF keeps its frames.
// Throws on bytes it cannot decode.
export async function messageImage(
  buf: Buffer,
  type: string,
): Promise<MessageImage> {
  const format = FORMATS[type as keyof typeof FORMATS];
  if (!format) throw new Error(`not a message image: ${type}`);
  const gif = type === 'image/gif';
  // A GIF has no EXIF orientation; anything else is turned upright before the EXIF goes.
  const source = gif ? sharp(buf, { animated: true }) : sharp(buf).rotate();
  const original = await format.write(source).toBuffer();
  const meta = await sharp(original, { animated: gif }).metadata();
  const thumbnail = await sharp(original)
    .resize(THUMBNAIL_SIDE, THUMBNAIL_SIDE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  return {
    original,
    ext: format.ext,
    width: meta.width ?? 0,
    height: meta.pageHeight ?? meta.height ?? 0,
    thumbnail,
  };
}
