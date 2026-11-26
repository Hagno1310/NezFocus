import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';
import { imageFileError } from '../../domain/attachments/upload';
import { ActionSheet, BottomSheet } from '../../shared/ui/Overlay';
import { Text } from '../../shared/ui/Text';

export type PickedPhoto = { uri: string; width: number; height: number };

// A picked photo goes to the crop screen; a GIF is refused here (AUTH-06 AC2).
function picked(
  result: ImagePicker.ImagePickerResult,
): PickedPhoto | 'type' | null {
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const type = asset.mimeType ?? 'image/jpeg';
  if (imageFileError({ size: 0, type }) === 'type') return 'type';
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

// The Android photo picker needs no permission (S-HOME-06 "Thêm ảnh" opens it directly).
export const pickFromLibrary = async () =>
  picked(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] }));

type CameraSheet = 'camera' | 'camera-blocked' | null;

// 07 S-ME-01 `avatar-sheet` / 08 S-SET-01 "Đổi ảnh server": library, camera, remove. The
// camera follows 10 S-MOD-05: explained first; once refused Android asks straight away;
// blocked → the sheet that opens Settings. 02 S-HOME-05 `picking` passes `onPhotos`: several
// photos at once, as they are (REQ-MSG-04).
export function PhotoSourceSheet({
  visible,
  title,
  labels,
  cameraBody,
  onRemove,
  onPicked,
  onPhotos,
  onTypeError,
  onDismiss,
}: {
  visible: boolean;
  title?: string;
  labels: { pick: string; take: string; remove?: string };
  cameraBody?: string; // S-MOD-05 `camera` (ảnh) for this use
  onRemove?: () => void; // only when there is a photo
  onPicked?: (photo: PickedPhoto) => void;
  onPhotos?: (photos: ImagePicker.ImagePickerAsset[]) => void;
  onTypeError?: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [cameraSheet, setCameraSheet] = useState<CameraSheet>(null);

  const handle = (result: ImagePicker.ImagePickerResult) => {
    if (onPhotos) {
      if (!result.canceled && result.assets.length) onPhotos(result.assets);
      return;
    }
    const one = picked(result);
    if (one === 'type') onTypeError?.();
    else if (one) onPicked?.(one);
  };

  // quality 1: the photo as taken; the library is the system photo picker (no permission).
  const shoot = async () =>
    handle(
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      }),
    );
  const library = async () =>
    handle(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: !!onPhotos,
        orderedSelection: true,
        quality: 1,
      }),
    );

  const takePhoto = async () => {
    onDismiss();
    const perm = await ImagePicker.getCameraPermissionsAsync();
    if (perm.granted) return void shoot();
    if (!perm.canAskAgain) return setCameraSheet('camera-blocked');
    if (perm.status === ImagePicker.PermissionStatus.UNDETERMINED)
      return setCameraSheet('camera');
    if ((await ImagePicker.requestCameraPermissionsAsync()).granted)
      void shoot();
  };

  const allowCamera = async () => {
    setCameraSheet(null);
    if ((await ImagePicker.requestCameraPermissionsAsync()).granted)
      void shoot();
  };

  const blocked = cameraSheet === 'camera-blocked';
  return (
    <>
      <ActionSheet
        visible={visible}
        title={title}
        // Frame 07 S-ME-01 `avatar-sheet` (08 S-SET-01 reuses it): no "Hủy" row.
        cancel={false}
        groups={[
          {
            items: [
              {
                label: labels.pick,
                icon: ImageIcon,
                onPress: () => {
                  onDismiss();
                  void library();
                },
              },
              {
                label: labels.take,
                icon: Camera,
                onPress: () => void takePhoto(),
              },
              ...(onRemove && labels.remove
                ? [
                    {
                      label: labels.remove,
                      icon: Trash2,
                      destructive: true,
                      onPress: () => {
                        onDismiss();
                        onRemove();
                      },
                    },
                  ]
                : []),
            ],
          },
        ]}
        onDismiss={onDismiss}
      />
      <BottomSheet
        visible={cameraSheet !== null}
        icon={{ as: Camera, color: 'text-primary', circle: true }}
        title={t(blocked ? 'me.camera.blockedTitle' : 'me.camera.title')}
        action={
          blocked
            ? {
                label: t('me.camera.openSettings'),
                onPress: () => {
                  setCameraSheet(null);
                  void Linking.openSettings();
                },
              }
            : {
                label: t('me.camera.continue'),
                onPress: () => void allowCamera(),
              }
        }
        secondary={{
          label: t('me.camera.later'),
          variant: 'text',
          onPress: () => setCameraSheet(null),
        }}
        onDismiss={() => setCameraSheet(null)}
      >
        <Text color="text-secondary" style={styles.center}>
          {blocked
            ? t('me.camera.blockedBody')
            : (cameraBody ?? t('me.camera.body'))}
        </Text>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
