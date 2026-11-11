import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
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
// blocked → the sheet that opens Settings.
export function PhotoSourceSheet({
  visible,
  title,
  labels,
  onRemove,
  onPicked,
  onTypeError,
  onDismiss,
}: {
  visible: boolean;
  title?: string;
  labels: { pick: string; take: string; remove: string };
  onRemove?: () => void; // only when there is a photo
  onPicked: (photo: PickedPhoto) => void;
  onTypeError: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [cameraSheet, setCameraSheet] = useState<CameraSheet>(null);

  const handle = (result: PickedPhoto | 'type' | null) => {
    if (result === 'type') onTypeError();
    else if (result) onPicked(result);
  };

  const shoot = async () =>
    handle(
      picked(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] })),
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
        groups={[
          {
            items: [
              {
                label: labels.pick,
                icon: ImageIcon,
                onPress: () => {
                  onDismiss();
                  void pickFromLibrary().then(handle);
                },
              },
              {
                label: labels.take,
                icon: Camera,
                onPress: () => void takePhoto(),
              },
              ...(onRemove
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
        icon={{ as: Camera, color: 'text-primary' }}
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
        <Text color="text-secondary">
          {t(blocked ? 'me.camera.blockedBody' : 'me.camera.body')}
        </Text>
      </BottomSheet>
    </>
  );
}
