import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CameraPreview } from '../../../data/voice/VoiceVideo';
import { size, space } from '../../../shared/theme';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { ParticipantTile } from '../../../shared/ui/Room';
import { Text } from '../../../shared/ui/Text';

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
        tone: 'muted',
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
            width={size.videoTilePreview}
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

// Frame `camera-self-preview`: the sentence 16 under the tile.
const styles = StyleSheet.create({
  tile: { alignItems: 'center', marginBottom: space[3] },
});
