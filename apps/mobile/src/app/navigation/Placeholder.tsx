import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConnectionBanner } from '../../features/gateway/components/ConnectionBanner';
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
  const { top } = useSafeAreaInsets();
  return (
    // No header here: the banner (S-MOD-04) would otherwise sit under the status bar.
    <View style={[styles.screen, { paddingTop: top }]}>
      <ConnectionBanner />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    padding: space[3],
  },
});
