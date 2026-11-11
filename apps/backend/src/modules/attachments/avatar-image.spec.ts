import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { avatarVariants, detectImageType } from './avatar-image.js';

const solid = (format: 'png' | 'jpeg' | 'webp' | 'gif', w = 300, h = 200) =>
  sharp({
    create: { width: w, height: h, channels: 3, background: '#c85028' },
  })
    .toFormat(format)
    .toBuffer();

const heic = readFileSync(join(__dirname, '../../../test/fixtures/photo.heic'));

describe('detectImageType', () => {
  it('reads the type from the bytes, not the name', async () => {
    expect(detectImageType(await solid('png'))).toBe('image/png');
    expect(detectImageType(await solid('jpeg'))).toBe('image/jpeg');
    expect(detectImageType(await solid('webp'))).toBe('image/webp');
    expect(detectImageType(await solid('gif'))).toBe('image/gif');
    expect(detectImageType(heic)).toBe('image/heic');
    expect(detectImageType(Buffer.from('MZ\x90\x00 not an image'))).toBe(
      undefined,
    );
  });
});

describe('avatarVariants (REQ-AUTH-06)', () => {
  it('makes square webp at 128, 256 and 512 from a png, and reports the source size (AC1)', async () => {
    const out = await avatarVariants(await solid('png'), 'image/png');
    expect(out.width).toBe(300);
    expect(out.height).toBe(200);
    expect(out.variants.map((v) => v.size)).toEqual([128, 256, 512]);
    for (const v of out.variants) {
      const meta = await sharp(v.body).metadata();
      expect(meta).toMatchObject({
        format: 'webp',
        width: v.size,
        height: v.size,
      });
    }
  });

  it('decodes an iPhone HEIC (AC4)', async () => {
    const out = await avatarVariants(heic, 'image/heic');
    expect(out.width).toBe(64);
    expect((await sharp(out.variants[0]!.body).metadata()).format).toBe('webp');
  });

  it('drops the photo metadata (NFR-SEC-04: no EXIF GPS)', async () => {
    const tagged = await sharp(await solid('jpeg'))
      .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '21/1 1/1 0/1' } })
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const out = await avatarVariants(tagged, 'image/jpeg');
    expect(
      (await sharp(out.variants[2]!.body).metadata()).exif,
    ).toBeUndefined();
  });
});
