import { Pressable, StyleSheet, View } from 'react-native';
import { disabledOpacity, radius, size, touchSlop, useTheme } from '../theme';

// Drawn, not RN Switch, to match board C-34 (48 × 28, knob 22) in both themes.
export function Switch({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={touchSlop(size.switch.height)}
      onPress={() => onChange?.(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.primary : colors['surface-3'],
          justifyContent: value ? 'flex-end' : 'flex-start',
        },
        disabled && styles.dim,
      ]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: value
              ? colors['on-primary']
              : colors['text-secondary'],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: size.switch.width,
    height: size.switch.height,
    padding: size.switch.inset,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: {
    width: size.switch.knob,
    height: size.switch.knob,
    borderRadius: radius.full,
  },
  dim: { opacity: disabledOpacity },
});
