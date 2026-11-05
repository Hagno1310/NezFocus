import { Info, OctagonX } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { size, space, typography } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

const looks = {
  // Board FormMessage: the block above the main button.
  block: { icon: 'base', gap: space[2] },
  // Board TextField › TF help, Checkbox › CB error: the note under one field.
  field: { icon: 'sm', gap: size.iconGap },
} as const;

// C-02 › Lỗi trong form: error = octagon-x + danger; neutral notice = info + text-secondary.
export function FormMessage({
  tone,
  text,
  icon,
  variant = 'block',
}: {
  tone: 'error' | 'info';
  text: string;
  icon?: IconComponent;
  variant?: keyof typeof looks;
}) {
  const error = tone === 'error';
  const color = error ? 'danger' : 'text-secondary';
  const look = looks[variant];
  return (
    <View
      style={[styles.row, { gap: look.gap }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.iconBox, { width: size.icon[look.icon] }]}>
        <Icon
          as={icon ?? (error ? OctagonX : Info)}
          size={look.icon}
          color={color}
        />
      </View>
      <Text variant="label" color={color} style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  // Centers the icon on the first line of text, which may wrap.
  iconBox: { height: typography.label.lineHeight, justifyContent: 'center' },
  text: { flex: 1 },
});
