import type { ChannelResponse } from '@nezfocus/shared';
import { ArrowUpDown } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ReorderEntry } from '../../../domain/servers/channels';
import type { ChannelSection } from '../../../domain/servers/drawer';
import {
  motion,
  radius,
  sheetShadow,
  space,
  useTheme,
} from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { Text } from '../../../shared/ui/Text';

type Layout = { y: number; h: number };

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
// sheet shadow) and follows the finger; the rows it passes slide aside. Releasing hands
// `onDrop` the slot among the other entries (see `dropTarget`).
// ponytail: khi danh sách dài hơn khung nhìn: tự cuộn khi kéo tới mép (lúc kéo danh sách
// khóa cuộn, nên chỉ thả được trong phần đang thấy).
export function ReorderList({
  sections,
  draggedId,
  renderEntry,
  onDrop,
}: {
  sections: readonly ChannelSection[];
  draggedId: string;
  renderEntry: (entry: ReorderEntry, lifted: boolean) => ReactNode;
  onDrop: (insertAt: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const entries: ReorderEntry[] = sections.flatMap(({ category, rows }) => [
    ...(category ? [{ kind: 'header' as const, category }] : []),
    ...rows.map((channel: ChannelResponse) => ({
      kind: 'channel' as const,
      channel,
    })),
  ]);
  const d = entries.findIndex(
    (e) => e.kind === 'channel' && e.channel.id === draggedId,
  );

  const layouts = useRef<Layout[]>([]);
  const centers = useSharedValue<number[]>([]);
  const home = useSharedValue(0); // the dragged row's center before it moved
  const height = useSharedValue(0);
  const ty = useSharedValue(0);
  const slot = useSharedValue(d);

  const measured = (i: number) => (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    layouts.current[i] = { y, h };
    const all = layouts.current;
    if (all.filter(Boolean).length < entries.length) return;
    centers.set(all.filter((_, j) => j !== d).map((l) => l.y + l.h / 2));
    home.set(all[d]!.y + all[d]!.h / 2);
    height.set(all[d]!.h);
  };

  const pan = usePanGesture({
    activeOffsetY: [-space[1], space[1]],
    onUpdate: (e) => {
      'worklet';
      ty.set(e.translationY);
      const c = home.get() + e.translationY;
      let n = 0;
      for (const x of centers.get()) if (x < c) n++;
      slot.set(n);
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(onDrop, slot.get());
    },
  });

  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.get() }],
  }));

  return (
    <View>
      {entries.map((entry, i) =>
        i === d ? (
          <GestureDetector key={keyOf(entry)} gesture={pan}>
            <Animated.View
              onLayout={measured(i)}
              style={[
                styles.lifted,
                { backgroundColor: colors['surface-3'] },
                sheetShadow(colors),
                lifted,
              ]}
            >
              {renderEntry(entry, true)}
            </Animated.View>
          </GestureDetector>
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
