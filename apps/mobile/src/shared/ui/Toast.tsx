import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { motion, radius, size, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';
import {
  initialToastState,
  toastReducer,
  type Toast,
  type ToastEvent,
  type ToastState,
} from './toastQueue';

export type { Toast };

// `anchor`: distance from the screen bottom to the top of the bottom bar (TabBar, button group).
const useToastStore = create<ToastState & { anchor: number }>(() => ({
  ...initialToastState,
  anchor: 0,
}));

const dispatch = (e: ToastEvent) =>
  useToastStore.setState((s) => toastReducer(s, e));

export const showToast = (toast: Toast) =>
  dispatch({ type: 'show', toast, now: Date.now() });
export const overlayOpened = () => dispatch({ type: 'overlay', open: true });
export const overlayClosed = () =>
  dispatch({ type: 'overlay', open: false, now: Date.now() });

// S-MOD-04 › Vị trí toast: the screen's bottom bar registers its height while mounted.
export function useToastAnchor(height: number) {
  useEffect(() => {
    useToastStore.setState({ anchor: height });
    return () => useToastStore.setState({ anchor: 0 });
  }, [height]);
}

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

// Mount once above the navigator. Above the keyboard when it is open, else above the anchor.
export function ToastHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const current = useToastStore((s) => s.current);
  const anchor = useToastStore((s) => s.anchor);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(
      () => dispatch({ type: 'tick', now: Date.now() }),
      current.hideAt - Date.now(),
    );
    return () => clearTimeout(id);
  }, [current]);

  if (!current) return null;
  const { toast } = current;
  const bottom = (keyboard || Math.max(anchor, insets.bottom)) + space[2];
  return (
    <Animated.View
      key={toast.message}
      entering={FadeIn.duration(motion.short)}
      exiting={FadeOut.duration(motion.short)}
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
      style={[styles.host, { bottom }]}
    >
      {/* C-14: inverted surface, no shadow; every icon takes the text colour. */}
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors['text-primary'],
            paddingRight: toast.action ? space[1] : space[3],
          },
        ]}
      >
        {toast.icon && <Icon as={toast.icon} size="md" color="bg" />}
        <Text variant="body-sm" color="bg" style={styles.message}>
          {toast.message}
        </Text>
        {toast.action && (
          <Pressable
            accessibilityRole="button"
            hitSlop={space[1]}
            onPress={() => {
              toast.action?.onPress();
              dispatch({ type: 'dismiss' });
            }}
            style={styles.action}
          >
            <Text variant="body-sm" weight="600" color="primary-inverse">
              {toast.action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space[3], right: space[3] },
  toast: {
    minHeight: size.touch,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingLeft: space[3],
    paddingVertical: space[1],
  },
  message: { flex: 1, paddingVertical: space[1] },
  action: {
    minHeight: size.buttonS,
    justifyContent: 'center',
    paddingHorizontal: space[2],
  },
});
