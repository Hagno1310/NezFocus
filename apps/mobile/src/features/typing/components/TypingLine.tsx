import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useStore } from 'zustand';
import { typingLine, typingStore } from '../../../domain/typing/typing';
import { motion, radius, size, space, useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';

// Marks where each name lands in the translated line; a name is never parsed as markup.
const MARK = '\u0001';
const DOT = 6;

// S-HOME-01 Typing (REQ-MSG-06), chốt 20/11/2026: laid out like a message row (dots in the
// avatar column, text on the message text column), names / "Nhiều người" at 600.
export function TypingLine({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const typers = useStore(typingStore.state, (s) => s[channelId]);
  const line = typingLine(typers?.map((x) => x.name) ?? []);
  if (!line) return null;
  const values: Record<string, string> =
    line.key === 'chat.typing.many'
      ? { many: t('chat.typing.manyPeople') }
      : line.values;
  const names = Object.values(values);
  const marked = Object.fromEntries(
    Object.keys(values).map((k, i) => [k, `${MARK}${i}${MARK}`]),
  );
  // i18next types each key's values; the marked copy has the same keys.
  const parts = (t as (key: string, options: object) => string)(
    line.key,
    marked,
  ).split(MARK);
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <View
        style={styles.dotsCell}
        importantForAccessibility="no-hide-descendants"
      >
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} />
        ))}
      </View>
      <Text
        variant="label"
        color="text-secondary"
        weight="400"
        numberOfLines={1}
        style={styles.text}
      >
        {parts.map((part, i) =>
          i % 2 ? (
            <Text key={i} variant="label" color="text-secondary" weight="600">
              {names[Number(part)]}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
    </View>
  );
}

// DESIGN.md Motion: slow and small; reduced motion keeps the dots still.
function Dot({ index }: { index: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(
      reduced
        ? 1
        : withDelay(
            index * motion.short,
            withRepeat(
              withTiming(0.3, { duration: motion.long / 2 }),
              -1,
              true,
            ),
          ),
    );
  }, [opacity, reduced, index]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: colors['text-secondary'] }, pulse]}
    />
  );
}

// Same columns as MessageBubble (shared/ui/Chat.tsx `message`, `avatarCell`); the frame's
// 8 pt under the line is the Messages padding, and ChatView's list already has 8 above it.
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space[3],
    paddingBottom: space[2],
  },
  dotsCell: {
    width: size.avatar[3],
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  text: { flex: 1 },
});
