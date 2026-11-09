import { StyleSheet, View } from 'react-native';
import { space } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

// A line of explanation under a screen header; the icon says it limits the viewer
// (S-SET-02 `hierarchy-blocked` lock, `everyone` info).
export function NoteLine({
  icon,
  text,
}: {
  icon?: IconComponent;
  text: string;
}) {
  return (
    <View style={styles.note}>
      {icon && <Icon as={icon} size="sm" color="text-secondary" />}
      <Text variant="label" color="text-secondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    paddingVertical: space[2],
  },
});
