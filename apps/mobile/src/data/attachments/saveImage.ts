import { Directory, File, Paths } from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';
import SaveToDownloads from '../../../modules/save-to-downloads';
import { imageAuth, imageSource } from './imageAuth';

// S-HOME-11 "Tải về" (CR-28 #29): the original into the phone's Download folder. A sent image is
// fetched with the bearer first; a pending one is already on the phone. Throws when it fails
// (no network, or a dev client built before the module).
export async function saveImage(image: {
  path: string | null; // the original's API path; null: `localUri` is the file
  localUri: string | null;
  name: string;
  type: string;
}) {
  if (!SaveToDownloads) throw new Error('SaveToDownloads not in this build');
  // Android 9 and below write Download through the old storage permission.
  if (Platform.OS === 'android' && Platform.Version < 29) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED)
      throw new Error('storage permission refused');
  }
  let uri = image.localUri;
  if (image.path) {
    const dir = new Directory(Paths.cache, 'image-downloads');
    if (!dir.exists) dir.create({ intermediates: true });
    const source = imageSource(image.path, '', imageAuth.getState().token);
    const file = await File.downloadFileAsync(
      source.uri,
      new File(dir, `${Date.now()}-${image.name}`),
      { headers: source.headers, idempotent: true },
    );
    uri = file.uri;
  }
  if (!uri) throw new Error('nothing to save');
  await SaveToDownloads.save(uri, image.name, image.type);
}
