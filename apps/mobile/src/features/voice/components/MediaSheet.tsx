import { Camera, CameraOff, Mic, MicOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import type { MediaSheet as Sheet } from '../hooks/useMediaFlow';

const icons = {
  mic: { ask: Mic, blocked: MicOff },
  camera: { ask: Camera, blocked: CameraOff },
};

// 10 S-MOD-05 `mic` (phòng) / `mic-blocked` (phòng) / `camera` / `camera-blocked`.
export function MediaSheet({
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
  const kind = sheet?.kind ?? 'mic';
  const blocked = !!sheet?.blocked;
  const text = (key: 'title' | 'body' | 'blockedTitle' | 'blockedBody') =>
    t(`voice.${kind}Sheet.${key}`);
  return (
    <BottomSheet
      visible={sheet !== null}
      icon={{
        as: icons[kind][blocked ? 'blocked' : 'ask'],
        color: 'text-primary',
        circle: true,
      }}
      title={text(blocked ? 'blockedTitle' : 'title')}
      action={
        blocked
          ? { label: t('voice.sheet.openSettings'), onPress: onSettings }
          : { label: t('voice.sheet.continue'), onPress: onContinue }
      }
      secondary={{
        label: t('voice.sheet.later'),
        variant: 'text',
        onPress: onLater,
      }}
      onDismiss={onLater}
    >
      <Text color="text-secondary" style={styles.center}>
        {text(blocked ? 'blockedBody' : 'body')}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
