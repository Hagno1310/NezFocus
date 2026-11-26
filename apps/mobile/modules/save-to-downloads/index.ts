import { requireOptionalNativeModule } from 'expo';

// Local Expo module (android/…/SaveToDownloadsModule.kt), CR-28 #29. null in a dev client built
// before it was added: callers show the generic error instead of crashing.
export type SaveToDownloadsNative = {
  save(fileUri: string, name: string, mimeType: string): Promise<void>;
};

export default requireOptionalNativeModule<SaveToDownloadsNative>(
  'SaveToDownloads',
);
