import { BIO_MAX, DISPLAY_NAME_MAX } from '@nezfocus/shared';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { profileFormErrors } from '../../../domain/account/profile';
import type { ImageFile } from '../../../domain/attachments/AttachmentRepository';
import type { ImageError } from '../../../domain/attachments/upload';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Dialog } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { showErrorToast } from '../../auth/hooks/useAuthActions';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { ImageSlot } from '../../media/ImageSlot';
import {
  PhotoSourceSheet,
  type PickedPhoto,
} from '../../media/PhotoSourceSheet';
import { avatarUri } from '../avatarUri';
import {
  useChangeAvatar,
  useMe,
  useRemoveAvatar,
  useSaveProfile,
} from '../hooks/useMe';

// S-ME-01 Sửa hồ sơ (REQ-AUTH-06). The photo saves as soon as it is cropped; the name and
// bio wait for "Lưu".
export function EditProfileScreen({
  cropped,
  onCrop,
  onBack,
  onSaved,
}: {
  cropped?: ImageFile; // back from the crop screen
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
  const [avatarError, setAvatarError] = useState<ImageError | null>(null);
  const [menu, setMenu] = useState(false);
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

  // 07 `uploading`: the new photo shows, dimmed, while it uploads.
  const [preview, setPreview] = useState<string | null>(null);
  // AC1–AC4 and the offline rule: the old photo stays, the typed text stays.
  const upload = async (file: ImageFile) => {
    setPreview(file.uri);
    const result = await uploader.run(file);
    setPreview(null);
    if (!result) return;
    setAvatarError(null);
    if (result.ok) return showToast({ message: t('me.profileSaved') });
    if (result.error === 'type' || result.error === 'too-big')
      setAvatarError(result.error);
    else
      showToast({
        message: t('me.uploadFailed'),
        action: { label: t('me.retry'), onPress: () => void upload(file) },
      });
  };

  // A new crop comes back as a route param.
  const onCropped = useEffectEvent((file: ImageFile) => void upload(file));
  useEffect(() => {
    if (cropped) onCropped(cropped);
  }, [cropped]);

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
            loading={saver.pending || uploading}
            loadingLabel={t('ui.saving')}
            onPress={() => void save()}
          />
        }
      />
      <ConnectionBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ImageSlot
          label={t('me.changeAvatar')}
          uploading={uploading}
          error={avatarError}
          disabled={!online || uploading}
          onPress={() => setMenu(true)}
          action={
            <Button
              variant="text"
              size="S"
              label={t('me.changeAvatar')}
              disabled={!online || uploading}
              onPress={() => setMenu(true)}
            />
          }
        >
          <Avatar
            name={name}
            uri={(uploader.pending && preview) || avatarUri(me?.avatar, '256')}
            size={96}
            self
          />
        </ImageSlot>

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
          // Frame S-ME-01: C-02 `disabled` (border, surface-2, tertiary text): fixed in MVP.
          disabled
        />
        <TextField
          label={t('me.bio')}
          value={bio}
          onChangeText={setBio}
          maxLength={BIO_MAX}
          counterMax={BIO_MAX}
          multiline
          minLines={3}
          readonly={!online || saver.pending}
        />
      </ScrollView>

      <PhotoSourceSheet
        visible={menu}
        labels={{
          pick: t('me.pickPhoto'),
          take: t('me.takePhoto'),
          remove: t('me.removePhoto'),
        }}
        onRemove={
          me?.avatar
            ? () =>
                void remover.run().then((ok) => {
                  if (ok) showToast({ message: t('me.profileSaved') });
                })
            : undefined
        }
        onPicked={(photo) => {
          setAvatarError(null);
          onCrop(photo);
        }}
        onTypeError={() => setAvatarError('type')}
        onDismiss={() => setMenu(false)}
      />

      <Dialog
        visible={!!leaving}
        title={t('me.discardTitle')}
        row
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
});
