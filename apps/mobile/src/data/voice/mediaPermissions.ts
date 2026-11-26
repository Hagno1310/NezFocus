import { cameraPermission } from './cameraPermission';
import { micPermission } from './micPermission';

// 10 S-MOD-05: the room's two permissions, by C-17 button.
export const mediaPermissions = {
  mic: micPermission,
  camera: cameraPermission,
};
export type MediaKind = keyof typeof mediaPermissions;
