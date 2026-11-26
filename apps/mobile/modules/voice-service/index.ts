import { requireOptionalNativeModule } from 'expo';

// Local Expo module (android/…/VoiceServiceModule.kt). null in a dev client built before it
// was added: the room still works, only not with the screen locked.
export type VoiceServiceNative = {
  // Starts or updates the foreground service; call it while the app is in the foreground
  // (Android 14 refuses a microphone service started from the background).
  start(
    title: string,
    text: string,
    channelName: string,
    camera: boolean,
  ): void;
  stop(): void;
};

export default requireOptionalNativeModule<VoiceServiceNative>('VoiceService');
