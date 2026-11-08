import {
  Permission,
  SERVER_NAME_MAX,
  hasPermission,
  type UpdateServerRequest,
} from '@nezfocus/shared';
import { usePreventRemove, useNavigation } from '@react-navigation/native';
import { Hash } from 'lucide-react-native';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { serverRepository } from '../../../data/servers';
import { channelSections } from '../../../domain/servers/drawer';
import {
  applyGatewayEvent,
  homeStore,
} from '../../../domain/servers/homeStore';
import { saveServer } from '../../../domain/servers/updateServer';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { ServerIcon } from '../components/ServerIcon';
import { useServerAccess } from '../hooks/useServerAccess';

// S-SET-01 `overview`, `overview-editing`, `overview-name-error`, `welcome-picker`,
// `welcome-off`. The name saves with "Lưu"; the kênh tin chào mừng saves on tap.
// ponytail: the server picture (96, "Đổi ảnh server") lands with P1-A4.7 (#211).
export function ServerOverviewScreen({
  serverId,
  onSaved,
  onLostAccess,
}: {
  serverId: string;
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

  const save = async (body: UpdateServerRequest) => {
    const result = await saveServer(serverRepository, serverId, body);
    if (result.ok)
      applyGatewayEvent({ t: 'SERVER_UPDATE', d: result.server, s: 0 });
    return result;
  };

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
          <ServerIcon server={saved} size={96} />
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
        <SettingsRow
          label={t('servers.settings.welcome')}
          value={
            welcome ? `# ${welcome.name}` : t('servers.settings.welcomeOff')
          }
          description={
            welcome
              ? t('servers.settings.welcomeHint')
              : t('servers.settings.welcomeOffHint')
          }
          onPress={() => setPicker(true)}
        />
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
});
