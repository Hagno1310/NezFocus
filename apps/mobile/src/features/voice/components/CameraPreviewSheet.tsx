import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CameraPreview } from '../../../data/voice/VoiceVideo';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { ParticipantTile } from '../../../shared/ui/Room';
import { Text } from '../../../shared/ui/Text';

const PREVIEW = 240; // frame `camera-self-preview`: 240 × 320

// S-ROOM-01 `camera-self-preview` (REQ-VC-01): nothing is sent before "Bật camera".
export function CameraPreviewSheet({
  visible,
  onTurnOn,
  onDismiss,
}: {
  visible: boolean;
  onTurnOn: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <BottomSheet
      visible={visible}
      title={t('voice.cameraPreview.title')}
      action={{ label: t('voice.cameraPreview.turnOn'), onPress: onTurnOn }}
      secondary={{
        label: t('voice.cameraPreview.cancel'),
        variant: 'text',
        onPress: onDismiss,
      }}
      onDismiss={onDismiss}
    >
      <View style={styles.tile}>
        {visible && (
          <ParticipantTile
            name=""
            self
            mic={null}
            width={PREVIEW}
            video={<CameraPreview />}
          />
        )}
      </View>
      <Text variant="body-sm" color="text-secondary">
        {t('voice.cameraPreview.body')}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ tile: { alignItems: 'center' } });
