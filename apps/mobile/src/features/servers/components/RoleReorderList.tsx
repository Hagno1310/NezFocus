import type { ReactNode } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  motion,
  radius,
  sheetShadow,
  space,
  useTheme,
} from '../../../shared/theme';

type Drag = {
  active: SharedValue<number>; // index being dragged, -1 none
  ty: SharedValue<number>; // finger travel
  slot: SharedValue<number>; // index it would land at
  centers: SharedValue<number[]>;
  heights: SharedValue<number[]>;
};

function Row({
  index,
  draggable,
  drag,
  onDrop,
  onLayout,
  children,
}: {
  index: number;
  draggable: boolean;
  drag: Drag;
  onDrop: (from: number, to: number) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const gesture = usePanGesture({
    enabled: draggable,
    activeOffsetY: [-space[1], space[1]],
    onActivate: () => {
      'worklet';
      drag.active.set(index);
      drag.slot.set(index);
      drag.ty.set(0);
    },
    onUpdate: (e) => {
      'worklet';
      drag.ty.set(e.translationY);
      const centers = drag.centers.get();
      const c = (centers[index] ?? 0) + e.translationY;
      let n = 0;
      centers.forEach((x, j) => {
        if (j !== index && x < c) n++;
      });
      drag.slot.set(n);
    },
    onDeactivate: () => {
      'worklet';
      const to = drag.slot.get();
      drag.active.set(-1);
      drag.ty.set(0);
      scheduleOnRN(onDrop, index, to);
    },
  });
  // The dragged row follows the finger; the rows it passes slide by its height.
  const style = useAnimatedStyle(() => {
    const a = drag.active.get();
    if (a === index)
      return { zIndex: 1, transform: [{ translateY: drag.ty.get() }] };
    if (a < 0) return { zIndex: 0, transform: [{ translateY: 0 }] };
    const s = drag.slot.get();
    const h = drag.heights.get()[a] ?? 0;
    const offset =
      a < index && index <= s ? -h : s <= index && index < a ? h : 0;
    return {
      zIndex: 0,
      transform: [
        { translateY: withTiming(offset, { duration: motion.short }) },
      ],
    };
  });
  const surface = colors['surface-3'];
  const shadow = sheetShadow(colors);
  const lifted = useAnimatedStyle(() =>
    drag.active.get() === index
      ? { backgroundColor: surface, ...shadow }
      : { backgroundColor: 'transparent' },
  );
  // Gotcha (AGENTS.md): measure outside GestureDetector, which wraps its child.
  return (
    <Animated.View
      onLayout={onLayout}
      style={[style, lifted, { borderRadius: radius.input }]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View collapsable={false}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// S-SET-02 `reorder`: every row with a handle can be dragged; releasing hands `onDrop` the
// row's index and where it would land. Rows the caller may not move stay put.
export function RoleReorderList<T>({
  items,
  keyOf,
  draggable,
  renderItem,
  onDrop,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  draggable: (item: T) => boolean;
  renderItem: (item: T) => ReactNode;
  onDrop: (from: number, to: number) => void;
}) {
  const drag: Drag = {
    active: useSharedValue(-1),
    ty: useSharedValue(0),
    slot: useSharedValue(-1),
    centers: useSharedValue<number[]>([]),
    heights: useSharedValue<number[]>([]),
  };
  const measured = (i: number) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    const centers = [...drag.centers.get()];
    const heights = [...drag.heights.get()];
    centers[i] = y + height / 2;
    heights[i] = height;
    drag.centers.set(centers);
    drag.heights.set(heights);
  };
  return (
    <>
      {items.map((item, i) => (
        <Row
          key={keyOf(item)}
          index={i}
          draggable={draggable(item)}
          drag={drag}
          onDrop={onDrop}
          onLayout={measured(i)}
        >
          {renderItem(item)}
        </Row>
      ))}
    </>
  );
}
