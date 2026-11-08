import {
  CHANNEL_NAME_MAX,
  MAX_CHANNELS_PER_SERVER,
  type ChannelResponse,
  type ChannelType,
} from '@nezfocus/shared';
import { Check, Folder, Hash, Volume2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { serverRepository } from '../../../data/servers';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  createChannel,
  namePreview,
  type ChannelActionError,
} from '../../../domain/servers/channels';
import { channelSections } from '../../../domain/servers/drawer';
import {
  applyGatewayEvent,
  homeStore,
} from '../../../domain/servers/homeStore';
import { size, space, useTheme } from '../../../shared/theme';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useChannelText } from '../hooks/useChannelText';

const TYPES = [
  { type: 'text', icon: Hash, label: 'typeText', hint: 'typeTextHint' },
  { type: 'voice', icon: Volume2, label: 'typeVoice', hint: 'typeVoiceHint' },
  {
    type: 'category',
    icon: Folder,
    label: 'typeCategory',
    hint: 'typeCategoryHint',
  },
] as const;

const upper = (name: string) => name.toLocaleUpperCase('vi');

// `category-picker`: one row of the list that replaces the form in the same sheet.
function PickRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${label}, ${description}` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickRow,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <View style={styles.flex}>
        <Text numberOfLines={1}>{label}</Text>
        {description && (
          <Text variant="label" color="text-secondary">
            {description}
          </Text>
        )}
      </View>
      {selected && <Icon as={Check} size="md" color="primary" />}
    </Pressable>
  );
}

// S-SET-09 Tạo kênh: `text`, `text-slug`, `voice`, `voice-off`, `category`,
// `category-picker`, `name-error`, `name-taken`, `limit`, `created`.
// ponytail: the "Kênh riêng tư" row and its `private*` states come with P1-A3.6 (#69).
export function CreateChannelSheet({
  serverId,
  visible,
  categoryId,
  onDismiss,
  onCreated,
}: {
  serverId: string;
  visible: boolean;
  categoryId?: string | null; // opened from a category's `plus`: chosen already (Q14)
  onDismiss: () => void;
  onCreated: (channel: ChannelResponse) => void;
}) {
  const { t } = useTranslation();
  const text = useChannelText();
  const channels = useStore(homeStore, (s) => s.channels[serverId]);
  const server = useStore(homeStore, (s) =>
    s.servers?.find((x) => x.id === serverId),
  );
  const categories = useMemo(
    () =>
      channelSections(channels ?? [], new Set(), null).flatMap((s) =>
        s.category ? [s.category] : [],
      ),
    [channels],
  );

  const [type, setType] = useState<ChannelType>('text');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [studyRoom, setStudyRoom] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<ChannelActionError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Each opening starts over: the category from `plus`, else the first one in the drawer.
  const [shown, setShown] = useState(false);
  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setType('text');
      setName('');
      setParentId(
        categoryId !== undefined ? categoryId : (categories[0]?.id ?? null),
      );
      // v1.9 CR-22: "Bật phòng học" on in a Study Server, off elsewhere.
      setStudyRoom(server?.template === 'study_server');
      setPicking(false);
      setError(null);
    }
  }

  const limit = (channels?.length ?? 0) >= MAX_CHANNELS_PER_SERVER;
  const category = categories.find((c) => c.id === parentId);
  const preview = namePreview(type, name);
  const nameError = text.nameError(error);

  const submit = async () => {
    if (!gatewayStore.getState().online) return setError({ kind: 'network' });
    setSubmitting(true);
    const result = await createChannel(
      serverRepository,
      serverId,
      channels ?? [],
      { type, name, parentId, studyRoom },
    );
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    const channel = result.channel;
    applyGatewayEvent({ t: 'CHANNEL_CREATE', d: channel, s: 0 });
    onDismiss();
    showToast({
      message:
        channel.type === 'text'
          ? t('servers.channels.createdText', { name: channel.name })
          : t('servers.channels.created', { name: channel.name }),
    });
    onCreated(channel);
  };

  const blockError =
    error?.kind === 'network'
      ? t('servers.channels.offline')
      : error?.kind === 'forbidden'
        ? t('servers.channels.lostAccess')
        : error?.kind === 'other'
          ? t('servers.channels.failed')
          : null;

  if (picking)
    return (
      <BottomSheet
        visible={visible}
        title={t('servers.channels.pickCategory')}
        onBack={() => setPicking(false)}
        onDismiss={onDismiss}
      >
        <PickRow
          label={t('servers.channels.noCategory')}
          description={t('servers.channels.noCategoryHint')}
          selected={parentId === null}
          onPress={() => {
            setParentId(null);
            setError(null);
            setPicking(false);
          }}
        />
        {categories.map((c) => (
          <PickRow
            key={c.id}
            label={upper(c.name)}
            selected={c.id === parentId}
            onPress={() => {
              setParentId(c.id);
              setError(null);
              setPicking(false);
            }}
          />
        ))}
      </BottomSheet>
    );

  return (
    <BottomSheet
      visible={visible}
      title={t('servers.channels.createTitle')}
      notice={limit ? t('servers.channels.limit') : null}
      error={blockError}
      action={{
        label: t('servers.channels.create'),
        disabled: limit,
        loading: submitting,
        onPress: () => void submit(),
      }}
      onDismiss={onDismiss}
    >
      <View style={styles.form}>
        <View accessibilityRole="radiogroup">
          {TYPES.map((o) => (
            <RadioRow
              key={o.type}
              label={t(`servers.channels.${o.label}`)}
              description={t(`servers.channels.${o.hint}`)}
              typeIcon={o.icon}
              selected={type === o.type}
              onPress={() => {
                setType(o.type);
                setError(null);
              }}
            />
          ))}
        </View>
        <View style={styles.field}>
          <TextField
            label={
              type === 'category'
                ? t('servers.channels.categoryNameLabel')
                : t('servers.channels.nameLabel')
            }
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
            counterMax={CHANNEL_NAME_MAX}
            placeholder={
              type === 'text'
                ? t('servers.channels.namePlaceholder')
                : undefined
            }
            error={nameError}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => !limit && void submit()}
          />
          {preview && (
            <FormMessage
              variant="field"
              tone="info"
              text={t('servers.channels.willSave', { name: preview })}
            />
          )}
        </View>
        {type !== 'category' && (
          <SettingsRow
            label={t('servers.channels.category')}
            value={
              category ? upper(category.name) : t('servers.channels.noCategory')
            }
            onPress={() => setPicking(true)}
          />
        )}
        {type === 'voice' && (
          <SettingsRow
            label={t('servers.channels.studyRoom')}
            description={t('servers.channels.studyRoomHint')}
            toggle={{ value: studyRoom, onChange: setStudyRoom }}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: space[2] },
  field: { gap: space[1], paddingTop: space[2] },
  pickRow: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
});
