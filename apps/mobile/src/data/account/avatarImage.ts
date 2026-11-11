import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { AvatarFile } from '../../domain/account/profile';

// SRS 7.3.5: crop and compress on the phone before uploading. Always JPEG, so a HEIC photo
// leaves the phone as JPEG; 512 is the largest size the backend keeps (AVATAR_SIZES).
const SIDE = 512;
const QUALITY = 0.85;

export async function prepareAvatar(
  uri: string,
  rect: { originX: number; originY: number; width: number; height: number },
): Promise<AvatarFile> {
  const image = await ImageManipulator.manipulate(uri)
    .crop(rect)
    .resize({ width: SIDE, height: SIDE })
    .renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: QUALITY,
  });
  const size = (await (await fetch(saved.uri)).blob()).size;
  return { uri: saved.uri, size, type: 'image/jpeg' };
}
