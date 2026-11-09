import {
  CHANNEL_NAME_MAX,
  MAX_CHANNELS_PER_SERVER,
  categoryTitle,
  type ChannelResponse,
  type ChannelType,
} from '@nezfocus/shared';
import { Check, EyeOff, Folder, Hash, Volume2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import {
  namePreview,
  type ChannelActionError,
} from '../../../domain/servers/channels';
import {
  privateHidesCreator,
  privateViewers,
} from '../../../domain/servers/channelPermissions';
import { channelSections } from '../../../domain/servers/drawer';
import { homeStore, removeChannel } from '../../../domain/servers/homeStore';
import { useOnOpen } from '../../../shared/hooks/useOnOpen';
import { size, space, useTheme } from '../../../shared/theme';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useChannelActions } from '../hooks/useChannelActions';
import { useChannelText } from '../hooks/useChannelText';
import { useServerAccess } from '../hooks/useServerAccess';

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
// `category-picker`, `name-error`, `name-taken`, `limit`, `created`, `private`,
// `private-roles`, `private-self-warning`.
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
  const actions = useChannelActions(serverId);
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [viewers, setViewers] = useState<string[]>([]);
  const [pickingRoles, setPickingRoles] = useState(false);
  const access = useServerAccess(serverId);
  const v =
    access?.userId && access.roles
      ? privateViewers(access.server, access.roles, {
          userId: access.userId,
          roleIds: access.roleIds,
        })
      : null;
  const [error, setError] = useState<ChannelActionError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Each opening starts over: the category from `plus`, else the first one in the drawer.
  useOnOpen(visible, () => {
    setType('text');
    setName('');
    setParentId(
      categoryId !== undefined ? categoryId : (categories[0]?.id ?? null),
    );
    // v1.9 CR-22: "Bật phòng học" on in a Study Server, off elsewhere.
    setStudyRoom(server?.template === 'study_server');
    setPicking(false);
    setIsPrivate(false);
    setViewers([]);
    setPickingRoles(false);
    setError(null);
  });

  const limit = (channels?.length ?? 0) >= MAX_CHANNELS_PER_SERVER;
  const category = categories.find((c) => c.id === parentId);
  const preview = namePreview(type, name);
  const nameError = text.nameError(error, type);

  const submit = async () => {
    setSubmitting(true);
    const result = await actions.create({
      type,
      name,
      parentId,
      studyRoom,
      viewerRoleIds: isPrivate && type !== 'category' ? viewers : undefined,
    });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    const channel = result.channel;
    onDismiss();
    // `private-self-warning` went ahead: the creator does not see the channel.
    if (hidesMe) {
      removeChannel(channel);
      return showToast({
        message:
          channel.type === 'text'
            ? t('servers.channels.createdText', { name: channel.name })
            : t('servers.channels.created', { name: channel.name }),
      });
    }
    // `created`: a new category only shows up in the drawer (spec 08 › S-SET-09).
    if (channel.type !== 'category')
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

  // `private-self-warning`: only a warning, the channel is still created.
  const hidesMe =
    isPrivate &&
    type !== 'category' &&
    !!access?.userId &&
    privateHidesCreator(
      access.server,
      access.roles ?? [],
      { userId: access.userId, roleIds: access.roleIds },
      { type, parent_id: parentId },
      channels ?? [],
      viewers,
    );
  const warning = (
    <FormMessage
      tone="info"
      icon={EyeOff}
      text={t('servers.overwrites.selfWarning')}
    />
  );

  if (pickingRoles && v)
    return (
      <BottomSheet
        visible={visible}
        title={t('servers.overwrites.viewers')}
        onBack={() => setPickingRoles(false)}
        onDismiss={onDismiss}
      >
        {v.rows.map(({ role, locked, mine }) => (
          <Checkbox
            key={role.id}
            label={role.name}
            locked={locked}
            description={
              locked
                ? t('servers.overwrites.alwaysSees')
                : mine
                  ? t('servers.overwrites.yourRole')
                  : undefined
            }
            checked={locked || viewers.includes(role.id)}
            onChange={(on) =>
              setViewers((ids) =>
                on ? [...ids, role.id] : ids.filter((id) => id !== role.id),
              )
            }
          />
        ))}
        {hidesMe && warning}
      </BottomSheet>
    );

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
            label={categoryTitle(c.name)}
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
      notice={
        limit
          ? t('servers.channels.limit')
          : hidesMe
            ? t('servers.overwrites.selfWarning')
            : null
      }
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
              category
                ? categoryTitle(category.name)
                : t('servers.channels.noCategory')
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
        {type !== 'category' && (
          <SettingsRow
            label={t('servers.overwrites.private')}
            description={t('servers.overwrites.privateHint')}
            toggle={{
              value: isPrivate,
              onChange: (on) => {
                setIsPrivate(on);
                // The creator's highest role starts ticked (v1.9 CR-17 #5).
                if (on) setViewers(v?.initial ?? []);
              },
            }}
          />
        )}
        {type !== 'category' && isPrivate && v && (
          <SettingsRow
            label={t('servers.overwrites.viewers')}
            value={String(
              v.rows.filter((r) => r.locked || viewers.includes(r.role.id))
                .length,
            )}
            onPress={() => setPickingRoles(true)}
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
