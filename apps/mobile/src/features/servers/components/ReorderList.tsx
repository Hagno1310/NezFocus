import { ArrowUpDown } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  reorderEntries,
  type ReorderEntry,
} from '../../../domain/servers/channels';
import type { ChannelSection } from '../../../domain/servers/drawer';
import {
  motion,
  radius,
  sheetShadow,
  size,
  space,
  useTheme,
} from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { Text } from '../../../shared/ui/Text';

type Layout = { y: number; h: number };

// Near the top or bottom of the visible list the list scrolls under the dragged row:
// within one row of the edge, up to this many points per frame.
const EDGE = size.touch;
const MAX_SPEED = space[2];

const keyOf = (e: ReorderEntry) =>
  e.kind === 'header' ? `h${e.category.id}` : `c${e.channel.id}`;

// How far entry i moves to make room while the dragged row (full index d, height h) would
// land before the `slot`-th other entry.
function useShift(
  i: number,
  d: number,
  slot: SharedValue<number>,
  h: SharedValue<number>,
) {
  return useAnimatedStyle(() => {
    const k = i < d ? i : i - 1; // index among the other entries
    const s = slot.get();
    const offset = s <= k && k < d ? h.get() : d <= k && k < s ? -h.get() : 0;
    return {
      transform: [
        { translateY: withTiming(offset, { duration: motion.short }) },
      ],
    };
  });
}

function Item({
  index,
  dragged,
  slot,
  height,
  onLayout,
  children,
}: {
  index: number;
  dragged: number;
  slot: SharedValue<number>;
  height: SharedValue<number>;
  onLayout: (e: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  const style = useShift(index, dragged, slot, height);
  return (
    <Animated.View onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  );
}

// 02 S-HOME-02 `reordering`: the channel picked from "Sắp xếp kênh" floats (`surface-3`,
// sheet shadow) and follows the finger; the rows it passes slide aside, and the list
// scrolls when the row nears an edge. Releasing hands `onDrop` the slot among the other
// entries (see `dropTarget`). The list must sit inside `scroll.ref`, with scrolling by
// hand turned off while this shows.
export function ReorderList({
  sections,
  draggedId,
  scroll,
  renderEntry,
  onDrop,
}: {
  sections: readonly ChannelSection[];
  draggedId: string;
  scroll: {
    ref: AnimatedRef<Animated.ScrollView>;
    offset: SharedValue<number>; // the list's scroll position
    viewport: SharedValue<number>; // the visible height of the list
  };
  renderEntry: (entry: ReorderEntry, lifted: boolean) => ReactNode;
  onDrop: (insertAt: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const entries = reorderEntries(sections, null);
  const d = entries.findIndex(
    (e) => e.kind === 'channel' && e.channel.id === draggedId,
  );

  const layouts = useRef<Layout[]>([]);
  const centers = useSharedValue<number[]>([]);
  const top = useSharedValue(0); // where this list starts in the scroll content
  const home = useSharedValue(0); // the dragged row's center before it moved
  const height = useSharedValue(0);
  const pan = useSharedValue(0); // finger travel
  const startOffset = useSharedValue(0); // scroll position when the drag began
  const ty = useSharedValue(0); // finger travel + scrolled since the drag began
  const slot = useSharedValue(d);
  const dragging = useSharedValue(false);

  const measured = (i: number) => (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    layouts.current[i] = { y, h };
    const all = layouts.current;
    if (all.filter(Boolean).length < entries.length) return;
    centers.set(all.filter((_, j) => j !== d).map((l) => l.y + l.h / 2));
    home.set(all[d]!.y + all[d]!.h / 2);
    height.set(all[d]!.h);
  };

  // Where the dragged row is now, and the slot it would land in.
  const follow = () => {
    'worklet';
    ty.set(pan.get() + scroll.offset.get() - startOffset.get());
    const c = home.get() + ty.get();
    let n = 0;
    for (const x of centers.get()) if (x < c) n++;
    slot.set(n);
  };

  useFrameCallback(() => {
    if (!dragging.get()) return;
    const onScreen = top.get() + home.get() + ty.get() - scroll.offset.get();
    const speed =
      onScreen < EDGE
        ? -MAX_SPEED * Math.min(1, (EDGE - onScreen) / EDGE)
        : onScreen > scroll.viewport.get() - EDGE
          ? MAX_SPEED *
            Math.min(1, (onScreen - scroll.viewport.get() + EDGE) / EDGE)
          : 0;
    if (speed === 0) return;
    scrollTo(scroll.ref, 0, Math.max(0, scroll.offset.get() + speed), false);
    follow();
  });

  const gesture = usePanGesture({
    activeOffsetY: [-space[1], space[1]],
    onActivate: () => {
      'worklet';
      startOffset.set(scroll.offset.get());
      dragging.set(true);
    },
    onUpdate: (e) => {
      'worklet';
      pan.set(e.translationY);
      follow();
    },
    onDeactivate: () => {
      'worklet';
      dragging.set(false);
      scheduleOnRN(onDrop, slot.get());
    },
  });

  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.get() }],
  }));

  return (
    <View onLayout={(e) => top.set(e.nativeEvent.layout.y)}>
      {entries.map((entry, i) =>
        i === d ? (
          // Gotcha: GestureDetector wraps its child in a native view of its own, so an
          // onLayout inside it reads y = 0. The row is measured outside it, like the others.
          <Animated.View
            key={keyOf(entry)}
            onLayout={measured(i)}
            style={[
              styles.lifted,
              { backgroundColor: colors['surface-3'] },
              sheetShadow(colors),
              lifted,
            ]}
          >
            <GestureDetector gesture={gesture}>
              <View>{renderEntry(entry, true)}</View>
            </GestureDetector>
          </Animated.View>
        ) : (
          <Item
            key={keyOf(entry)}
            index={i}
            dragged={d}
            slot={slot}
            height={height}
            onLayout={measured(i)}
          >
            {renderEntry(entry, false)}
          </Item>
        ),
      )}
      <View style={styles.hint}>
        <Icon as={ArrowUpDown} size="sm" color="text-tertiary" />
        <Text variant="label" color="text-tertiary">
          {t('servers.channels.reorderHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lifted: { zIndex: 1, borderRadius: radius.input },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[2],
    paddingTop: space[3],
  },
});
