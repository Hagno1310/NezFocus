import { useRef, type ReactNode } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
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
  // On the JS thread: a role list is short, and the drop calls React state straight away.
  const gesture = usePanGesture({
    runOnJS: true,
    enabled: draggable,
    activeOffsetY: [-space[1], space[1]],
    onActivate: () => {
      drag.active.set(index);
      drag.slot.set(index);
      drag.ty.set(0);
    },
    onUpdate: (e) => {
      drag.ty.set(e.translationY);
      const centers = drag.centers.get();
      const c = (centers[index] ?? 0) + e.translationY;
      let n = 0;
      for (let j = 0; j < centers.length; j++)
        if (j !== index && centers[j]! < c) n++;
      drag.slot.set(n);
    },
    onFinalize: () => {
      if (drag.active.get() !== index) return;
      const to = drag.slot.get();
      drag.active.set(-1);
      drag.ty.set(0);
      onDrop(index, to);
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
  // The lifted look (`surface-3`, sheet shadow) is a layer under the row that fades in:
  // an animated style that swaps boxShadow back to none left it stuck on the device.
  const lifted = useAnimatedStyle(() => ({
    opacity: drag.active.get() === index ? 1 : 0,
  }));
  // Gotcha (AGENTS.md): measure outside GestureDetector, which wraps its child.
  return (
    <Animated.View onLayout={onLayout} style={style}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.lifted,
          { backgroundColor: colors['surface-3'] },
          sheetShadow(colors),
          lifted,
        ]}
      />
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
  // Gotcha: rows lay out in one batch, and a shared value read on the JS thread right
  // after a set still gives the old array, so each row would wipe the others. Collect in a ref.
  const layouts = useRef<{ y: number; h: number }[]>([]);
  const measured = (i: number) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    layouts.current[i] = { y, h: height };
    const all = layouts.current.slice(0, items.length);
    drag.centers.set(all.map((l) => (l ? l.y + l.h / 2 : 0)));
    drag.heights.set(all.map((l) => l?.h ?? 0));
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

const styles = StyleSheet.create({
  lifted: { borderRadius: radius.input },
});
