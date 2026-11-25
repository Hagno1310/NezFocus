import { StyleSheet, View } from 'react-native';
import { radius, size, space, useTheme } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

// C-21 ChipStatus: a label, never a button (S-HOME-10 "Bạn bè", "Đã gửi lời mời", "Đã chặn").
export function ChipStatus({
  icon,
  label,
}: {
  icon: IconComponent;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.chip, { borderColor: colors.border }]}
    >
      <Icon as={icon} size="xs" color="text-secondary" />
      <Text variant="label" color="text-secondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Board C-21: 28 high, pill, hairline; padding 16 (token `chip-status`, chốt 25/11/2026).
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.iconGap,
    height: 28,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: size.hairline,
  },
});
