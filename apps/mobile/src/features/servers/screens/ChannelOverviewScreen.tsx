import { CHANNEL_NAME_MAX } from '@nezfocus/shared';
import { usePreventRemove, useNavigation } from '@react-navigation/native';
import { Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  namePreview,
  type ChannelActionError,
} from '../../../domain/servers/channels';
import { disabledOpacity, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { Dialog } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { TypeNameSheet } from '../../../shared/ui/TypeNameSheet';
import { useChannelAccess } from '../hooks/useChannelAccess';
import { useChannelActions } from '../hooks/useChannelActions';
import { useChannelText } from '../hooks/useChannelText';

// S-SET-06 `overview`, `editing`, `name-error`, `discard-confirm`, `delete-confirm`,
// `deleted`, `offline`; text channel `text-overview`, `name-taken`,
// `welcome-delete-confirm`; Edge case `long-name-overview` (the field wraps to show it all).
// The delete-confirm sentence about a running Room Session lands with P3-B3.4 (#148).
export function ChannelOverviewScreen({
  serverId,
  channelId,
  onSaved,
  onClose,
}: {
  serverId: string;
  channelId: string;
  onSaved: () => void; // back to the list
  onClose: () => void; // back to the drawer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const text = useChannelText();
  const navigation = useNavigation();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const actions = useChannelActions(serverId);
  // Leaving on purpose (saved, deleted, lost access) skips "Bỏ thay đổi?".
  const leavingOnPurpose = useRef(false);
  const close = () => {
    leavingOnPurpose.current = true;
    onClose();
  };
  const access = useChannelAccess(serverId, channelId, 'overview', close);
  // The field starts from the saved name, also when the list loads after this screen.
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<ChannelActionError | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  if (name === null && access) setName(access.channel.name);
  const dirty = !!access && name !== null && name !== access.channel.name;

  usePreventRemove(dirty && !saving, ({ data }) =>
    leavingOnPurpose.current
      ? navigation.dispatch(data.action)
      : setLeaving(() => () => navigation.dispatch(data.action)),
  );

  if (!access || name === null) return null;
  const { channel, isWelcome, lostAccess } = access;
  const label = channel.type === 'text' ? `#${channel.name}` : channel.name;

  const save = async () => {
    setSaving(true);
    const result = await actions.rename(channel, name);
    setSaving(false);
    if (result.ok) {
      showToast({ message: t('servers.channels.renamed') });
      leavingOnPurpose.current = true;
      return onSaved();
    }
    const e = result.error;
    if (e.kind === 'forbidden') return lostAccess();
    if (e.kind === 'network' || e.kind === 'other' || e.kind === 'limit')
      return showToast({
        message: t('servers.settings.saveFailed'),
        action: { label: t('servers.settings.retry'), onPress: save },
      });
    setError(e);
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteFailed(false);
    const result = await actions.remove(channel);
    setDeleting(false);
    if (!result.ok) {
      if (result.error.kind === 'forbidden') {
        setConfirming(false);
        return lostAccess();
      }
      return setDeleteFailed(true);
    }
    // Gone from the list: useChannelAccess closes this screen and S-SET-06.
    setConfirming(false);
    showToast({ message: t('servers.channels.deleted', { name: label }) });
  };

  const preview = namePreview(channel.type, name);
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={t('servers.channels.overview')}
        onBack={navigation.goBack}
        action={
          <Button
            variant="text"
            size="S"
            label={t('servers.channels.save')}
            disabled={!dirty || offline}
            loading={saving}
            loadingLabel={t('ui.saving')}
            onPress={() => void save()}
          />
        }
      />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <TextField
            label={t('servers.channels.nameLabel')}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
            counterMax={CHANNEL_NAME_MAX}
            readonly={offline}
            error={text.nameError(error, channel.type)}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            onSubmitEditing={() => dirty && void save()}
          />
          {preview && (
            <FormMessage
              variant="field"
              tone="info"
              text={t('servers.channels.willSave', { name: preview })}
            />
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('servers.channels.delete')}
          accessibilityState={{ disabled: offline }}
          disabled={offline}
          onPress={() => setConfirming(true)}
          style={[styles.danger, offline && { opacity: disabledOpacity }]}
        >
          <Icon as={Trash2} size="lg" color="danger" />
          <Text color="danger">{t('servers.channels.delete')}</Text>
        </Pressable>
      </ScrollView>

      <TypeNameSheet
        visible={confirming}
        title={t('servers.channels.deleteTitle', { name: label })}
        body={
          channel.type === 'voice'
            ? t('servers.channels.deleteBodyVoice')
            : isWelcome
              ? t('servers.channels.deleteBodyWelcome')
              : t('servers.channels.deleteBodyText')
        }
        label={t('servers.channels.typeNameLabel')}
        name={channel.name}
        confirmLabel={t('servers.channels.delete')}
        submitting={deleting}
        error={deleteFailed ? t('servers.channels.failed') : null}
        onConfirm={() => void remove()}
        onDismiss={() => setConfirming(false)}
      />

      <Dialog
        visible={!!leaving}
        title={t('servers.settings.discardTitle')}
        body={t('servers.channels.discardBody')}
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
  field: { gap: space[1] },
  danger: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
});
