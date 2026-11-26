import { Mic, MicOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import type { MicSheet as Sheet } from '../hooks/useMicFlow';

// 10 S-MOD-05 `mic` (phòng) / `mic-blocked` (phòng).
export function MicSheet({
  sheet,
  onContinue,
  onSettings,
  onLater,
}: {
  sheet: Sheet;
  onContinue: () => void;
  onSettings: () => void;
  onLater: () => void;
}) {
  const { t } = useTranslation();
  const blocked = sheet === 'mic-blocked';
  return (
    <BottomSheet
      visible={sheet !== null}
      icon={{ as: blocked ? MicOff : Mic, color: 'text-primary', circle: true }}
      title={t(
        blocked ? 'voice.micSheet.blockedTitle' : 'voice.micSheet.title',
      )}
      action={
        blocked
          ? { label: t('voice.micSheet.openSettings'), onPress: onSettings }
          : { label: t('voice.micSheet.continue'), onPress: onContinue }
      }
      secondary={{
        label: t('voice.micSheet.later'),
        variant: 'text',
        onPress: onLater,
      }}
      onDismiss={onLater}
    >
      <Text color="text-secondary" style={styles.center}>
        {t(blocked ? 'voice.micSheet.blockedBody' : 'voice.micSheet.body')}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
