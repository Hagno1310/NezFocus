import {
  CHANNEL_NAME_MAX,
  categoryTitle,
  planCategoryDelete,
  type ChannelResponse,
} from '@nezfocus/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import type { ChannelActionError } from '../../../domain/servers/channels';
import { homeStore } from '../../../domain/servers/homeStore';
import { useOnOpen } from '../../../shared/hooks/useOnOpen';
import { Dialog } from '../../../shared/ui/Overlay';
import { TextField } from '../../../shared/ui/TextField';
import { useChannelActions } from '../hooks/useChannelActions';
import { useChannelText } from '../hooks/useChannelText';

// 08 S-SET-06 `category-rename`, `category-rename-taken`: the dialog stays open on an error.
export function CategoryRenameDialog({
  visible,
  category,
  onDismiss,
}: {
  visible: boolean;
  category: ChannelResponse | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const text = useChannelText();
  const actions = useChannelActions(category?.server_id ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<ChannelActionError | null>(null);
  const [saving, setSaving] = useState(false);
  useOnOpen(visible, () => {
    setName(category?.name ?? '');
    setError(null);
  });
  if (!category) return null;

  const save = async () => {
    setSaving(true);
    const result = await actions.rename(category, name);
    setSaving(false);
    if (result.ok) return onDismiss();
    if (result.error.kind === 'forbidden') {
      onDismiss();
      return text.lostAccess();
    }
    setError(result.error);
  };

  const fieldError = text.nameError(error, 'category');
  return (
    <Dialog
      visible={visible}
      title={t('servers.channels.categoryRename')}
      error={error && !fieldError ? t('servers.channels.failed') : null}
      cancel={{ label: t('servers.channels.cancel'), onPress: onDismiss }}
      confirm={{
        label: t('servers.channels.save'),
        loading: saving,
        onPress: () => void save(),
      }}
      onDismiss={onDismiss}
    >
      <TextField
        label={t('servers.channels.categoryNameLabel')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        counterMax={CHANNEL_NAME_MAX}
        error={fieldError}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
    </Dialog>
  );
}

// 08 S-SET-06 `category-delete-confirm` / `category-delete-blocked` (SRV-02 AC5): a child
// named like an uncategorized channel blocks the delete before any API call.
export function CategoryDeleteDialog({
  visible,
  category,
  onDismiss,
}: {
  visible: boolean;
  category: ChannelResponse | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const text = useChannelText();
  const actions = useChannelActions(category?.server_id ?? '');
  const channels = useStore(homeStore, (s) =>
    category ? s.channels[category.server_id] : undefined,
  );
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  useOnOpen(visible, () => setFailed(false));
  if (!category || !channels) return null;

  const plan = planCategoryDelete(channels, category);
  const name = categoryTitle(category.name);
  if (!plan.ok) {
    const d = plan.reason === 'duplicate' ? plan.duplicate : null;
    return (
      <Dialog
        visible={visible}
        title={t('servers.channels.categoryBlockedTitle', { name })}
        body={
          d?.kind === 'channel'
            ? t(
                d.type === 'text'
                  ? 'servers.channels.categoryBlockedText'
                  : 'servers.channels.categoryBlockedVoice',
                { name: d.name },
              )
            : undefined
        }
        confirm={{ label: t('servers.channels.gotIt'), onPress: onDismiss }}
        onDismiss={onDismiss}
      />
    );
  }

  const remove = async () => {
    setDeleting(true);
    const result = await actions.removeCategory(category);
    setDeleting(false);
    if (result.ok) return onDismiss();
    if (result.error.kind === 'forbidden') {
      onDismiss();
      return text.lostAccess();
    }
    setFailed(true);
  };

  return (
    <Dialog
      visible={visible}
      title={t('servers.channels.categoryDeleteTitle', { name })}
      body={t('servers.channels.categoryDeleteBody', {
        count: plan.moved.length,
      })}
      error={failed ? t('servers.channels.failed') : null}
      cancel={{ label: t('servers.channels.cancel'), onPress: onDismiss }}
      confirm={{
        label: t('servers.channels.categoryDelete'),
        variant: 'danger',
        loading: deleting,
        onPress: () => void remove(),
      }}
      onDismiss={onDismiss}
    />
  );
}
