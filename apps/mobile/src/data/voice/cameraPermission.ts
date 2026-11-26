import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import type { MediaPermissions } from '../../domain/voice/mediaPermission';

// The same Android CAMERA permission as "Chụp ảnh" (S-ME-01); expo-image-picker tells canAskAgain.
const EXPLAINED = 'voice.cameraExplained';

export const cameraPermission: MediaPermissions = {
  async check() {
    const [p, explained] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      AsyncStorage.getItem(EXPLAINED),
    ]);
    return {
      granted: p.granted,
      asked:
        explained !== null ||
        p.status !== ImagePicker.PermissionStatus.UNDETERMINED,
      canAskAgain: p.canAskAgain,
    };
  },
  explained: () => AsyncStorage.setItem(EXPLAINED, '1'),
  request: async () =>
    (await ImagePicker.requestCameraPermissionsAsync()).granted,
  openSettings: () => Linking.openSettings(),
};
