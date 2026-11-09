import {
  useIsFocused,
  useNavigation,
  type EventArg,
} from '@react-navigation/native';
import { useEffect, useState } from 'react';

// Android detaches the views of a stack screen that another screen covers. Changing what
// such a screen mounts (S-HOME-02 `no-server` → the drawers, when the first server is
// created from S-HOME-06 above it) crashes Fabric: "addViewAt: failed to insert view …
// The specified child already has a parent". So a value that picks the screen's tree is
// held while the screen is covered and taken once the screen has appeared again.
export function useHeldWhileCovered<T>(value: T): T {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const [held, setHeld] = useState(value);
  const [waiting, setWaiting] = useState(false);

  if (!Object.is(held, value) && !waiting) {
    if (focused) setHeld(value);
    else setWaiting(true);
  }

  useEffect(() => {
    if (!waiting) return;
    // native-stack emits transitionEnd (closing: false) when the screen has appeared.
    return navigation.addListener(
      'transitionEnd' as never,
      (e: EventArg<'transitionEnd', false, { closing: boolean }>) => {
        if (!e.data?.closing) setWaiting(false);
      },
    );
  }, [waiting, navigation]);

  return held;
}
