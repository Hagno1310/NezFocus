import { BIO_MAX, DISPLAY_NAME_MAX } from '@nezfocus/shared';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  avatarFileError,
  profileFormErrors,
  type AvatarError,
  type AvatarFile,
} from '../../../domain/account/profile';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { ActionSheet, BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { showErrorToast } from '../../auth/hooks/useAuthActions';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { avatarUri } from '../avatarUri';
import {
  useChangeAvatar,
  useMe,
  useRemoveAvatar,
  useSaveProfile,
} from '../hooks/useMe';

export type PickedPhoto = { uri: string; width: number; height: number };

// 10 › S-MOD-05: the camera explained before Android asks; blocked → Settings.
type CameraSheet = 'camera' | 'camera-blocked' | null;

// S-ME-01 Sửa hồ sơ (REQ-AUTH-06). The photo saves as soon as it is cropped; the name and
// bio wait for "Lưu".
export function EditProfileScreen({
  cropped,
  onCrop,
  onBack,
  onSaved,
}: {
  cropped?: AvatarFile; // back from CropAvatar
  onCrop: (photo: PickedPhoto) => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const online = useOnline();
  const me = useMe().data;

  const [displayName, setDisplayName] = useState(me?.display_name ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [nameError, setNameError] = useState<'empty' | 'too-long' | null>(null);
  const [avatarError, setAvatarError] = useState<AvatarError | null>(null);
  const [menu, setMenu] = useState(false);
  const [cameraSheet, setCameraSheet] = useState<CameraSheet>(null);
  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  const [saved, setSaved] = useState(false);

  const saver = useSaveProfile();
  const uploader = useChangeAvatar();
  const remover = useRemoveAvatar();
  const uploading = uploader.pending || remover.pending;

  const dirty =
    displayName !== (me?.display_name ?? '') || bio !== (me?.bio ?? '');

  // Spec 07 › Lưu thay đổi: back with unsaved text asks first.
  usePreventRemove(dirty && !saver.pending && !saved, ({ data }) =>
    setLeaving(() => () => navigation.dispatch(data.action)),
  );
  const finish = useEffectEvent(() => {
    onSaved();
    showToast({ message: t('me.profileSaved') });
  });
  useEffect(() => {
    if (saved) finish();
  }, [saved]);

  const save = async () => {
    const errors = profileFormErrors({ displayName, bio });
    setNameError(errors.displayName ?? null);
    if (errors.displayName) return;
    const result = await saver.run({ displayName, bio });
    if (!result) return;
    if (result.ok) setSaved(true);
    else if (result.error === 'name-empty') setNameError('empty');
    else showErrorToast(result.error);
  };

  // AC1–AC4 and the offline rule: the old photo stays, the typed text stays.
  const upload = async (file: AvatarFile) => {
    const result = await uploader.run(file);
    if (!result) return;
    setAvatarError(null);
    if (result.ok) {
      showToast({ message: t('me.profileSaved') });
      return;
    }
    if (result.error === 'type' || result.error === 'too-big')
      setAvatarError(result.error);
    else
      showToast({
        message: t('me.uploadFailed'),
        action: { label: t('me.retry'), onPress: () => void upload(file) },
      });
  };

  // A new crop comes back as a route param.
  const onCropped = useEffectEvent((file: AvatarFile) => void upload(file));
  useEffect(() => {
    if (cropped) onCropped(cropped);
  }, [cropped]);

  const openPicked = (result: ImagePicker.ImagePickerResult) => {
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    // AC2: a GIF is refused here, before the crop.
    const type = asset.mimeType ?? 'image/jpeg';
    if (avatarFileError({ uri: asset.uri, size: 0, type }) === 'type') {
      setAvatarError('type');
      return;
    }
    setAvatarError(null);
    onCrop({ uri: asset.uri, width: asset.width, height: asset.height });
  };

  const pick = async () => {
    setMenu(false);
    // The Android photo picker needs no permission.
    openPicked(
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] }),
    );
  };

  const shoot = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
    });
    openPicked(result);
  };

  // S-MOD-05 › Luồng: explain first; once refused it asks straight away; blocked → Settings.
  const takePhoto = async () => {
    setMenu(false);
    const perm = await ImagePicker.getCameraPermissionsAsync();
    if (perm.granted) return void shoot();
    if (!perm.canAskAgain) return setCameraSheet('camera-blocked');
    if (perm.status === ImagePicker.PermissionStatus.UNDETERMINED)
      return setCameraSheet('camera');
    const asked = await ImagePicker.requestCameraPermissionsAsync();
    if (asked.granted) void shoot();
  };

  const allowCamera = async () => {
    setCameraSheet(null);
    const asked = await ImagePicker.requestCameraPermissionsAsync();
    if (asked.granted) void shoot();
  };

  const avatar = avatarUri(me?.avatar, '256');
  const name = displayName.trim() || me?.display_name || me?.username || '';

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <ScreenHeader
        title={t('me.openProfile')}
        onBack={onBack}
        action={
          <Button
            variant="text"
            size="S"
            label={t('me.save')}
            disabled={!dirty || !online || uploading}
            loading={saver.pending}
            onPress={() => void save()}
          />
        }
      />
      <ConnectionBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('me.changeAvatar')}
            disabled={!online || uploading}
            onPress={() => setMenu(true)}
          >
            <View style={uploading && styles.dim}>
              <Avatar name={name} uri={avatar} size={96} self />
            </View>
            {uploading && (
              <View style={styles.spinner}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            )}
          </Pressable>
          <Button
            variant="text"
            size="S"
            label={t('me.changeAvatar')}
            disabled={!online || uploading}
            onPress={() => setMenu(true)}
          />
          {avatarError && (
            <FormMessage
              tone="error"
              text={t(
                avatarError === 'type' ? 'me.uploadType' : 'me.uploadTooBig',
              )}
            />
          )}
        </View>

        <TextField
          label={t('auth.complete.displayName')}
          value={displayName}
          onChangeText={(v) => {
            setDisplayName(v);
            setNameError(null);
          }}
          maxLength={DISPLAY_NAME_MAX}
          counterMax={DISPLAY_NAME_MAX}
          helper={nameError ? undefined : t('auth.complete.displayNameHelp')}
          error={
            nameError === 'empty'
              ? t('auth.complete.displayNameEmpty')
              : nameError === 'too-long'
                ? t('auth.complete.displayNameTooLong')
                : null
          }
          readonly={!online || saver.pending}
        />
        <TextField
          label={t('auth.complete.username')}
          value={me?.username ?? ''}
          readonly
        />
        <TextField
          label={t('me.bio')}
          value={bio}
          onChangeText={setBio}
          maxLength={BIO_MAX}
          counterMax={BIO_MAX}
          multiline
          readonly={!online || saver.pending}
        />
      </ScrollView>

      <ActionSheet
        visible={menu}
        groups={[
          {
            items: [
              {
                label: t('me.pickPhoto'),
                icon: ImageIcon,
                onPress: () => void pick(),
              },
              {
                label: t('me.takePhoto'),
                icon: Camera,
                onPress: () => void takePhoto(),
              },
              ...(me?.avatar
                ? [
                    {
                      label: t('me.removePhoto'),
                      icon: Trash2,
                      destructive: true,
                      onPress: () => {
                        setMenu(false);
                        void remover.run().then((ok) => {
                          if (ok) showToast({ message: t('me.profileSaved') });
                        });
                      },
                    },
                  ]
                : []),
            ],
          },
        ]}
        onDismiss={() => setMenu(false)}
      />

      <BottomSheet
        visible={cameraSheet !== null}
        icon={{ as: Camera, color: 'text-primary' }}
        title={t(
          cameraSheet === 'camera-blocked'
            ? 'me.camera.blockedTitle'
            : 'me.camera.title',
        )}
        action={
          cameraSheet === 'camera-blocked'
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
          {t(
            cameraSheet === 'camera-blocked'
              ? 'me.camera.blockedBody'
              : 'me.camera.body',
          )}
        </Text>
      </BottomSheet>

      <Dialog
        visible={!!leaving}
        title={t('me.discardTitle')}
        body={t('me.discardProfile')}
        cancel={{ label: t('me.stay'), onPress: () => setLeaving(null) }}
        confirm={{
          label: t('me.discard'),
          variant: 'danger',
          onPress: () => {
            const go = leaving;
            setLeaving(null);
            go?.();
          },
        }}
        onDismiss={() => setLeaving(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[3], gap: space[3] },
  avatarBlock: { alignItems: 'center', gap: space[1] },
  dim: { opacity: 0.4 },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
