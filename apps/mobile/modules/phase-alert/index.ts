import { requireOptionalNativeModule } from 'expo';

// Local Expo module (android/…/PhaseAlertModule.kt). null in a dev client built before it
// was added: callers fall back instead of crashing.
export type PhaseAlertNative = {
  isSilenced(): boolean;
  play(force: boolean): void;
  vibrate(): void;
};

export default requireOptionalNativeModule<PhaseAlertNative>('PhaseAlert');
