import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { Text } from '../../shared/ui/Text';

type Action = { label: string; onPress: () => void };

// ponytail: stand-in screen; each screen ticket replaces its placeholder.
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
      <Text variant="title-2" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body-sm" color="text-secondary">
        {t('placeholder.note')}
      </Text>
      {actions.map((a) => (
        <Button
          key={a.label}
          variant="secondary"
          label={a.label}
          onPress={a.onPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    padding: space[3],
  },
});
