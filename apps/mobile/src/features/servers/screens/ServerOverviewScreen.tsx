import { Permission, SERVER_NAME_MAX, hasPermission } from '@nezfocus/shared';
import { usePreventRemove, useNavigation } from '@react-navigation/native';
import { Camera, Hash } from 'lucide-react-native';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { channelSections } from '../../../domain/servers/drawer';
import { homeStore } from '../../../domain/servers/homeStore';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import type { ImageFile } from '../../../domain/attachments/AttachmentRepository';
import type { ImageError } from '../../../domain/attachments/upload';
import { useOnline } from '../../gateway/hooks/useOnline';
import { ImageSlot } from '../../media/ImageSlot';
import {
  PhotoSourceSheet,
  type PickedPhoto,
} from '../../media/PhotoSourceSheet';
import { ServerIcon } from '../components/ServerIcon';
import { useServerIcon } from '../hooks/useServerIcon';
import { useSaveServer } from '../hooks/useSaveServer';
import { useServerAccess } from '../hooks/useServerAccess';

// S-SET-01 `overview`, `overview-editing`, `overview-name-error`, `welcome-picker`,
// `welcome-off`. The name saves with "Lưu"; the kênh tin chào mừng saves on tap.
// The picture (96, "Đổi ảnh server", P1-A4.7 #211) saves as soon as it is cropped.
export function ServerOverviewScreen({
  serverId,
  cropped,
  onCrop,
  onSaved,
  onLostAccess,
}: {
  serverId: string;
  cropped?: ImageFile; // back from the crop screen
  onCrop: (photo: PickedPhoto) => void;
  onSaved: () => void; // back to the list
  onLostAccess: () => void; // back to the drawer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const access = useServerAccess(serverId);
  const channels = useStore(homeStore, (s) => s.channels[serverId]);
  const saved = access?.server;
  const [name, setName] = useState(saved?.name ?? '');
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  // The welcome channel shown while its save is in flight (optimistic, rolled back on error).
  const [pendingWelcome, setPendingWelcome] = useState<
    string | null | undefined
  >();
  const dirty = !!saved && name !== saved.name;

  const lostAccess = () => {
    showToast({ message: t('servers.settings.lostAccess') });
    onLostAccess();
  };
  const canManage =
    !!access && hasPermission(access.perms, Permission.MANAGE_SERVER);
  const lost = !access || (access.roles !== undefined && !canManage);
  const onLost = useEffectEvent(lostAccess);
  useEffect(() => {
    if (lost) onLost();
  }, [lost]);

  const textChannels = useMemo(
    () =>
      channelSections(channels ?? [], new Set(), null)
        .flatMap((s) => s.rows)
        .filter((c) => c.type === 'text'),
    [channels],
  );

  const save = useSaveServer(serverId);

  const online = useOnline();
  const icon = useServerIcon(serverId);
  const [iconMenu, setIconMenu] = useState(false);
  const [iconError, setIconError] = useState<ImageError | null>(null);
  // 08 `overview-icon-uploading`: the new picture shows, dimmed, while it uploads.
  const [preview, setPreview] = useState<string | null>(null);
  // 07 upload-error for type / size; offline keeps the old picture + Toast "Thử lại".
  const setIcon = async (file: ImageFile | null) => {
    setPreview(file?.uri ?? null);
    const result = await icon.run(file);
    setPreview(null);
    if (!result) return;
    setIconError(null);
    if (result.ok) return;
    if (result.error === 'forbidden') return lostAccess();
    if (result.error === 'type' || result.error === 'too-big')
      return setIconError(result.error);
    showToast({
      message: t(file ? 'me.uploadFailed' : 'servers.settings.saveFailed'),
      action: { label: t('me.retry'), onPress: () => void setIcon(file) },
    });
  };
  const onCropped = useEffectEvent((file: ImageFile) => void setIcon(file));
  useEffect(() => {
    if (cropped) onCropped(cropped);
  }, [cropped]);

  const saveName = async () => {
    setSaving(true);
    const result = await save({ name });
    setSaving(false);
    if (result.ok) {
      showToast({ message: t('servers.settings.saved') });
      return onSaved();
    }
    if (result.error === 'name') return setNameError(true);
    if (result.error === 'forbidden') return lostAccess();
    showToast({
      message: t('servers.settings.saveFailed'),
      action: { label: t('servers.settings.retry'), onPress: saveName },
    });
  };

  const pickWelcome = async (channelId: string | null) => {
    setPicker(false);
    setPendingWelcome(channelId);
    const result = await save({ system_channel_id: channelId });
    setPendingWelcome(undefined);
    if (result.ok) return;
    if (result.error === 'forbidden') return lostAccess();
    showToast({
      message: t('servers.settings.saveFailed'),
      action: {
        label: t('servers.settings.retry'),
        onPress: () => void pickWelcome(channelId),
      },
    });
  };

  // Spec 08 › Ô chữ: back with an unsaved name asks first.
  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  usePreventRemove(dirty && !saving && !lost, ({ data }) =>
    setLeaving(() => () => navigation.dispatch(data.action)),
  );

  if (!saved) return null;
  const welcomeId =
    pendingWelcome !== undefined ? pendingWelcome : saved.system_channel_id;
  // A deleted welcome channel already reads null (SRV-01 v1.9) → "Không gửi".
  const welcome = textChannels.find((c) => c.id === welcomeId);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={t('servers.settings.overview')}
        onBack={navigation.goBack}
        action={
          <Button
            variant="text"
            size="S"
            label={t('servers.settings.save')}
            disabled={!dirty}
            loading={saving}
            onPress={saveName}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.icon}>
          <ImageSlot
            label={t('servers.settings.changeIcon')}
            uploading={icon.pending}
            error={iconError}
            disabled={!online || icon.pending}
            onPress={() => setIconMenu(true)}
            action={
              // Frame `overview`: "Đổi ảnh server" `label` `primary` under the icon.
              <Pressable
                accessibilityRole="button"
                disabled={!online || icon.pending}
                onPress={() => setIconMenu(true)}
                hitSlop={space[2]}
              >
                <Text
                  variant="label"
                  color={!online || icon.pending ? 'text-tertiary' : 'primary'}
                >
                  {t('servers.settings.changeIcon')}
                </Text>
              </Pressable>
            }
          >
            <View>
              <ServerIcon
                server={saved}
                size={96}
                uri={icon.pending ? preview : undefined}
              />
              {/* Frame `overview`: camera badge 28, `surface-3` with a `bg` ring. */}
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors['surface-3'],
                    borderColor: colors.bg,
                  },
                ]}
              >
                <Icon as={Camera} size="sm" color="text-primary" />
              </View>
            </View>
          </ImageSlot>
        </View>
        <TextField
          label={t('servers.create.nameLabel')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(false);
          }}
          counterMax={SERVER_NAME_MAX}
          maxLength={SERVER_NAME_MAX}
          error={nameError ? t('servers.create.nameError') : null}
          returnKeyType="done"
          onSubmitEditing={() => dirty && void saveName()}
        />
        <View>
          <SettingsRow
            label={t('servers.settings.welcome')}
            value={
              welcome ? `# ${welcome.name}` : t('servers.settings.welcomeOff')
            }
            onPress={() => setPicker(true)}
          />
          {/* Frame `overview`: the hint is its own line under the row. */}
          <Text variant="label" color="text-secondary">
            {welcome
              ? t('servers.settings.welcomeHint')
              : t('servers.settings.welcomeOffHint')}
          </Text>
        </View>
      </ScrollView>

      <BottomSheet
        visible={picker}
        title={t('servers.settings.welcome')}
        onDismiss={() => setPicker(false)}
      >
        <RadioRow
          label={t('servers.settings.welcomeOff')}
          description={t('servers.settings.welcomeOffHint')}
          selected={!welcome}
          onPress={() => void pickWelcome(null)}
        />
        {textChannels.map((c) => (
          <RadioRow
            key={c.id}
            label={c.name}
            typeIcon={Hash}
            selected={c.id === welcome?.id}
            onPress={() => void pickWelcome(c.id)}
          />
        ))}
      </BottomSheet>

      <PhotoSourceSheet
        visible={iconMenu}
        title={t('servers.settings.changeIcon')}
        labels={{
          pick: t('servers.settings.pickIcon'),
          take: t('servers.settings.takeIcon'),
          remove: t('servers.settings.removeIcon'),
        }}
        onRemove={saved.icon_url ? () => void setIcon(null) : undefined}
        onPicked={(photo) => {
          setIconError(null);
          onCrop(photo);
        }}
        onTypeError={() => setIconError('type')}
        onDismiss={() => setIconMenu(false)}
      />

      <Dialog
        visible={!!leaving}
        title={t('servers.settings.discardTitle')}
        body={t('servers.settings.discardBody')}
        cancel={{
          label: t('servers.settings.stay'),
          onPress: () => setLeaving(null),
        }}
        confirm={{
          label: t('servers.settings.discard'),
          variant: 'danger',
          onPress: () => {
            const go = leaving;
            setLeaving(null);
            go?.();
          },
        }}
        onDismiss={() => setLeaving(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: space[3], gap: space[3] },
  icon: { alignItems: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: size.icon.hero - space[1],
    height: size.icon.hero - space[1],
    borderRadius: size.icon.hero,
    borderWidth: size.strokeThick,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
