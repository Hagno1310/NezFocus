import { useEffect, useId, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { radius, space, touchSlop, typography, useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { fadeIn, fadeOut } from './transitions';
import {
  initialToastState,
  toastReducer,
  type Toast,
  type ToastEvent,
  type ToastState,
} from './toastQueue';

export type { Toast };

// `anchors`: heights of the bars stacked at the screen bottom (TabBar, MiniPlayer, button group).
// `top`: a screen that wants its toasts under its header (03 Study Room), from the window top.
const useToastStore = create<
  ToastState & { anchors: Record<string, number>; top: number | null }
>(() => ({
  ...initialToastState,
  anchors: {},
  top: null,
}));

const dispatch = (e: ToastEvent) =>
  useToastStore.setState((s) => toastReducer(s, e));

export const showToast = (toast: Toast) =>
  dispatch({ type: 'show', toast, now: Date.now() });
export const overlayOpened = () => dispatch({ type: 'overlay', open: true });
export const dropPendingToasts = () => dispatch({ type: 'drop-pending' });
export const overlayClosed = () =>
  dispatch({ type: 'overlay', open: false, now: Date.now() });

// S-MOD-04 › Vị trí toast: bottom bars (TabBar, MiniPlayer) add up; the toast sits above them all.
export function useToastAnchor(height: number) {
  const id = useId();
  useEffect(() => {
    const set = (h: number | undefined) =>
      useToastStore.setState(({ anchors }) => {
        const { [id]: _, ...rest } = anchors;
        return { anchors: h ? { ...rest, [id]: h } : rest };
      });
    set(height);
    return () => set(undefined);
  }, [id, height]);
}

// 03 › Quy ước chung › Toast: on the room screen toasts sit right under the header.
export function useToastTop(top: number | null) {
  useEffect(() => {
    if (top === null) return;
    useToastStore.setState({ top });
    return () => useToastStore.setState({ top: null });
  }, [top]);
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
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const current = useToastStore((s) => s.current);
  const anchor = useToastStore((s) =>
    Object.values(s.anchors).reduce((a, b) => a + b, 0),
  );
  const top = useToastStore((s) => s.top);

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
  const place =
    top !== null && !keyboard
      ? { top: top + space[2] }
      : { bottom: (keyboard || Math.max(anchor, insets.bottom)) + space[2] };
  return (
    <Animated.View
      key={toast.message}
      entering={fadeIn}
      exiting={fadeOut}
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
      style={[styles.host, place]}
    >
      <ToastCard
        toast={toast}
        onAction={() => {
          toast.action?.onPress();
          dispatch({ type: 'dismiss' });
        }}
      />
    </Animated.View>
  );
}

// C-14 Toast shape, also for a toast that belongs to a sheet (S-HOME-07 `copied`: the global
// host sits under the sheet's Modal window).
export function ToastCard({
  toast,
  onAction,
}: {
  toast: Toast;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  // C-14: inverted surface, no shadow; every icon takes the text colour.
  return (
    <View style={[styles.toast, { backgroundColor: colors['text-primary'] }]}>
      {toast.icon && <Icon as={toast.icon} size="base" color="bg" />}
      <Text variant="body-sm" weight="500" color="bg" style={styles.message}>
        {toast.message}
      </Text>
      {toast.action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          hitSlop={touchSlop(typography['body-sm'].lineHeight)}
          onPress={onAction}
        >
          <Text variant="body-sm" weight="600" color="primary-inverse">
            {toast.action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space[3], right: space[3] },
  // Board Toast: padding 12 / 16, gap 12; the action is plain text with a 48 slop.
  toast: {
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    paddingHorizontal: space[3],
    paddingVertical: space[2] + space[1],
  },
  message: { flex: 1 },
});
