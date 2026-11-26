import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { PickedImage } from '../../domain/attachments/tray';

const HEIF = ['image/heic', 'image/heif'];

// Photos waiting in the tray or the outbox live here, so a message still pending after a
// restart has its images (CR-28 #29); removed once sent or dropped.
const keptDir = () => {
  const dir = new Directory(Paths.document, 'outbox-images');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

// REQ-MSG-04, SRS 7.3.5: HEIC / HEIF leaves the phone as JPEG.
async function toPicked(asset: ImagePickerAsset): Promise<PickedImage> {
  const declared = (asset.mimeType ?? 'image/jpeg').toLowerCase();
  const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'image.jpg';
  let source = asset.uri;
  let { width, height } = asset;
  let type = declared;
  let fileName = name;
  if (HEIF.includes(declared)) {
    const image = await ImageManipulator.manipulate(asset.uri).renderAsync();
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.9,
    });
    ({ uri: source, width, height } = saved);
    type = 'image/jpeg';
    fileName = `${name.replace(/\.(heic|heif)$/i, '')}.jpg`;
  }
  const kept = new File(
    keptDir(),
    `${randomUUID()}.${fileName.split('.').pop() ?? 'jpg'}`,
  );
  await new File(source).copy(kept);
  return {
    uri: kept.uri,
    name: fileName,
    size: kept.size ?? asset.fileSize ?? 0,
    type,
    width,
    height,
  };
}

export const toPickedImages = (assets: readonly ImagePickerAsset[]) =>
  Promise.all(assets.map(toPicked));

export function releaseImage(file: PickedImage) {
  try {
    const kept = new File(file.uri);
    if (kept.exists) kept.delete();
  } catch {
    // Already gone: nothing to free.
  }
}
