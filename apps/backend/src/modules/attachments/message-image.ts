import sharp from 'sharp';

// CR-28 #29: the longer side of the thumbnail the chat shows first (NFR-MOB-07).
export const THUMBNAIL_SIDE = 720;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
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
  const ext = EXT[type];
  if (!ext) throw new Error(`not a message image: ${type}`);
  const gif = type === 'image/gif';
  const source = gif ? sharp(buf, { animated: true }) : sharp(buf).rotate();
  const original = await (
    gif
      ? source.gif()
      : type === 'image/png'
        ? source.png()
        : type === 'image/webp'
          ? source.webp({ quality: 90 })
          : source.jpeg({ quality: 90, mozjpeg: true })
  ).toBuffer();
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
    ext,
    width: meta.width ?? 0,
    height: meta.pageHeight ?? meta.height ?? 0,
    thumbnail,
  };
}
