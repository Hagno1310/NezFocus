import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space, useTheme } from '../../../shared/theme';
import { Icon, type IconComponent } from '../../../shared/ui/Icon';
import { Text } from '../../../shared/ui/Text';

// S-DM-02 `not-friend` / `not-friend-sent` / `blocked-by-me`: surface-2, icon 16 · text · buttons S.
export function DmStrip({
  icon,
  text,
  children,
}: {
  icon: IconComponent;
  text: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.strip, { backgroundColor: colors['surface-2'] }]}>
      <Icon as={icon} size="sm" color="text-secondary" />
      <Text variant="label" style={styles.text}>
        {text}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
    paddingRight: space[2],
    paddingLeft: space[3],
  },
  text: { flex: 1 },
});
