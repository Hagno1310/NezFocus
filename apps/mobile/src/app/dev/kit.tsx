import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space, useTheme } from '../../shared/theme';
import { Text } from '../../shared/ui/Text';

// Layout helpers for the dev-only UI Gallery.

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Text variant="title-2">{title}</Text>
      {children}
    </View>
  );
}

export function Caption({ children }: { children: string }) {
  return (
    <Text variant="label" color="text-tertiary">
      {children}
    </Text>
  );
}

export const Row = ({ children }: { children: ReactNode }) => (
  <View style={styles.row}>{children}</View>
);

export const Stack = ({ children }: { children: ReactNode }) => (
  <View style={styles.stack}>{children}</View>
);

const styles = StyleSheet.create({
  section: { gap: space[3], paddingTop: space[3], borderTopWidth: 1 },
  stack: { gap: space[2] },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    alignItems: 'center',
  },
});
