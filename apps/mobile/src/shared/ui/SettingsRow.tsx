import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { fontScale as textScale, size, space, useTheme } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { AvatarStack } from './People';
import { Switch } from './Switch';
import { Text } from './Text';

// C-15. No horizontal padding: the screen sets it (usually 16).
// `value` = value variant, `people` = value · avatar variant, `toggle` = switch variant, none = nav.
export function SettingsRow({
  label,
  icon,
  description,
  value,
  people,
  toggle,
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
  // The whole row flips the switch (one target, one screen-reader stop).
  toggle?: { value: boolean; onChange: (next: boolean) => void };
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
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityLabel={[label, valueText, description]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={
        toggle ? { disabled, checked: toggle.value } : { disabled }
      }
      disabled={disabled}
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
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
          description || stacked || toggle ? styles.grow : styles.keep,
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
      {toggle ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          <Switch value={toggle.value} label={label} disabled={disabled} />
        </View>
      ) : (
        <Icon as={ChevronRight} size="md" color="text-tertiary" />
      )}
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
