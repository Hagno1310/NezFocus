import { StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

// DESIGN.md › Cỡ chữ 200%: narrow labels (TabBar, SegmentedControl) show the full text on long press.
// Render inside a `position: relative` parent; it floats above it.
export function Tooltip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" style={styles.anchor}>
      <View
        style={[styles.bubble, { backgroundColor: colors['text-primary'] }]}
      >
        <Text variant="label" color="bg" maxFontSizeMultiplier={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    bottom: '100%',
    left: -space[6],
    right: -space[6],
    alignItems: 'center',
    marginBottom: space[1],
    zIndex: 1,
  },
  bubble: {
    borderRadius: radius.input,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
});
