import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { size, space } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Mascot } from '../../../shared/ui/Mascot';
import { Text } from '../../../shared/ui/Text';
import { useLastCycle, useStartSolo } from '../hooks/useSolo';
import { notificationPrompt } from '../hooks/useSoloAlerts';

// S-ROOM-09 first-focus: explained before the system dialog, once. "Để sau" still starts (no dialog).
export function AskNotifications({ onStarted }: { onStarted: () => void }) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const cycle = useLastCycle((s) => s.pending ?? s.cycle);
  const start = useStartSolo();
  const go = async (allow: boolean) => {
    await notificationPrompt.answer(allow);
    start.mutate(cycle, { onSettled: onStarted });
  };
  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <Mascot mood="neutral" size={size.mascotSummary} />
      <Text variant="title-1" style={styles.center} accessibilityRole="header">
        {t('study.alerts.askTitle')}
      </Text>
      <Text color="text-secondary" style={styles.center}>
        {t('study.alerts.askBody')}
      </Text>
      <View style={styles.actions}>
        <Button
          size="L"
          fullWidth
          label={t('study.alerts.askAllow')}
          loading={start.isPending}
          onPress={() => void go(true)}
        />
        <Button
          variant="text"
          fullWidth
          label={t('study.alerts.askLater')}
          onPress={() => void go(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[4],
  },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space[2], marginTop: space[3] },
});
