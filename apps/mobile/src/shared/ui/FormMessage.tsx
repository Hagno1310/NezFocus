import { Info, OctagonX } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { space, typography, size } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

// C-02 › Lỗi trong form: error = octagon-x + danger; neutral notice = info + text-secondary.
export function FormMessage({
  tone,
  text,
  icon,
}: {
  tone: 'error' | 'info';
  text: string;
  icon?: IconComponent;
}) {
  const error = tone === 'error';
  const color = error ? 'danger' : 'text-secondary';
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <View style={styles.iconBox}>
        <Icon as={icon ?? (error ? OctagonX : Info)} size="sm" color={color} />
      </View>
      <Text variant="label" color={color} style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[1] },
  // Centers the icon on the first line of text, which may wrap.
  iconBox: {
    height: typography.label.lineHeight,
    justifyContent: 'center',
    width: size.icon.sm,
  },
  text: { flex: 1 },
});
