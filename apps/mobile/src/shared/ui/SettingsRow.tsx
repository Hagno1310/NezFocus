import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { fontScale as textScale, size, space, useTheme } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { AvatarStack } from './People';
import { Text } from './Text';

// C-15. No horizontal padding: the screen sets it (usually 16).
// `value` = value variant, `people` = value · avatar variant, neither = nav variant.
// ponytail: `switch` variant is P2 in the spec (S-SET, area 07); add it with that screen.
export function SettingsRow({
  label,
  icon,
  description,
  value,
  people,
  onPress,
  disabled = false,
}: {
  label: string;
  // Board SettingsRow has an optional leading 22 icon.
  icon?: IconComponent;
  // Also the reason line when `disabled`.
  description?: string;
  value?: string;
  people?: { name: string; uri?: string | null }[];
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  // C-15: at 200% the value moves under the label.
  const stacked = fontScale >= textScale.large;
  const valueText = people ? people.map((p) => p.name).join(', ') : value;
  const fg = disabled ? 'text-tertiary' : 'text-primary';

  const valueNode = (people || value) && (
    <View style={[styles.value, !description && !stacked && styles.valueFill]}>
      {people && <AvatarStack people={people} size={24} />}
      {valueText && (
        <Text
          variant="body"
          color={disabled ? 'text-tertiary' : 'text-secondary'}
          numberOfLines={1}
          style={styles.shrink}
        >
          {valueText}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, valueText, description]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      {icon && (
        <Icon
          as={icon}
          size="lg"
          color={disabled ? 'text-tertiary' : 'text-secondary'}
        />
      )}
      {/* C-15: a one-line row keeps the label whole; the value takes the rest and truncates. */}
      <View
        style={[
          styles.labels,
          description || stacked ? styles.grow : styles.keep,
        ]}
      >
        <Text color={fg} weight="500" numberOfLines={stacked ? undefined : 1}>
          {label}
        </Text>
        {description && (
          <Text
            variant="label"
            weight="400"
            color={disabled ? 'text-tertiary' : 'text-secondary'}
          >
            {description}
          </Text>
        )}
        {stacked && valueNode}
      </View>
      {!stacked && valueNode}
      <Icon as={ChevronRight} size="md" color="text-tertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    paddingVertical: space[2],
  },
  labels: { gap: space[1] / 2 },
  grow: { flex: 1 },
  keep: { flexShrink: 0 },
  value: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  valueFill: { flex: 1, justifyContent: 'flex-end' },
  shrink: { flexShrink: 1 },
});
