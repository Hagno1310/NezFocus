import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../theme';
import { Text } from './Text';

// C-30 FilterChip: 36 high (48 to touch), padding 14, full radius. Selected: `surface-3`,
// 2 `primary` border, `text-primary` 600; otherwise a 1 `border` and `text-secondary`.
export function FilterChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? {
              backgroundColor: colors['surface-3'],
              borderColor: colors.primary,
              borderWidth: 2,
            }
          : { borderColor: colors.border, borderWidth: 1 },
        pressed && !selected && { backgroundColor: colors['overlay-pressed'] },
        disabled && styles.disabled,
      ]}
    >
      <Text
        variant="body-sm"
        weight={selected ? '600' : undefined}
        color={selected ? 'text-primary' : 'text-secondary'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// A wrapping row of chips (inside a sheet chips may wrap — C-30).
export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
