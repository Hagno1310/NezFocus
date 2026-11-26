import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import type { MediaPermissions } from '../../domain/voice/mediaPermission';

// The same Android CAMERA permission as "Chụp ảnh" (S-ME-01); expo-image-picker tells canAskAgain.
export const cameraPermission: MediaPermissions = {
  async check() {
    const p = await ImagePicker.getCameraPermissionsAsync();
    return {
      granted: p.granted,
      asked: p.status !== ImagePicker.PermissionStatus.UNDETERMINED,
      canAskAgain: p.canAskAgain,
    };
  },
  request: async () =>
    (await ImagePicker.requestCameraPermissionsAsync()).granted,
  openSettings: () => Linking.openSettings(),
};
