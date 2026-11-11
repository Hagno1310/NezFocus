import { Circle, CircleDot } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { size, space, useTheme } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

// C-34 RadioRow (board `C-34 · RadioRow · …`): one choice of a pick-one list, 56 high.
// `typeIcon`: the kind of thing picked (`hash` for a text channel).
export function RadioRow({
  label,
  description,
  typeIcon,
  leading,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  typeIcon?: IconComponent;
  // Same spot as typeIcon, for a non-icon marker (S-ME-02 status sheet: PresenceDot).
  leading?: ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${label}, ${description}` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Icon
        as={selected ? CircleDot : Circle}
        size="lg"
        color={selected ? 'primary' : 'text-tertiary'}
      />
      {typeIcon && <Icon as={typeIcon} size="md" color="text-secondary" />}
      {leading}
      <View style={styles.text}>
        <Text numberOfLines={1}>{label}</Text>
        {description && (
          <Text variant="label" color="text-secondary">
            {description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
  text: { flex: 1, gap: space[1] / 2 },
});
