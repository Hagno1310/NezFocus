import {
  Fit,
  RiveView,
  useRiveEnum,
  useRiveFile,
  useRiveTrigger,
  useViewModelInstance,
} from '@rive-app/react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

// packages/mascot README › Hợp đồng: view model `Mascot`, enum `mood`; state machine `Main` must run.
export type MascotMood =
  'neutral' | 'happy' | 'wink' | 'focus' | 'surprised' | 'sleepy' | 'confused';

const RUNTIME = require('../../../../../packages/mascot/dist/runtime.riv');

// DESIGN.md › Mascot: Runtime, animated through Rive; decorative, so screen readers skip it.
// `wave`: waves hello once when it appears (Welcome, DESIGN.md › Mascot).
export function Mascot({
  mood,
  size,
  wave = false,
}: {
  mood: MascotMood;
  size: number;
  wave?: boolean;
}) {
  const { riveFile } = useRiveFile(RUNTIME);
  const { instance } = useViewModelInstance(riveFile, { async: true });
  const { setValue } = useRiveEnum('mood', instance);
  useEffect(() => {
    if (instance) setValue(mood);
  }, [instance, mood, setValue]);
  const { trigger } = useRiveTrigger('wave', instance);
  useEffect(() => {
    if (instance && wave) trigger();
  }, [instance, wave, trigger]);

  const box = { width: size, height: size };
  if (!riveFile || !instance) return <View style={box} />;
  return (
    <View
      style={box}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <RiveView
        file={riveFile}
        dataBind={instance}
        stateMachineName="Main"
        fit={Fit.Contain}
        autoPlay
        style={box}
      />
    </View>
  );
}
