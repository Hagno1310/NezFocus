import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Action = { label: string; onPress: () => void };

// ponytail: unstyled stand-in until shared/ui lands (P0-3b); each screen ticket replaces its placeholder.
export function Placeholder({
  title,
  actions = [],
}: {
  title: string;
  actions?: Action[];
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text>{t('placeholder.note')}</Text>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          onPress={a.onPress}
          style={styles.button}
        >
          <Text>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '600' },
  button: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
});
