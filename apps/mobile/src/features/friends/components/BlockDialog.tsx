import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { friendActions } from '../../../data/friends';
import { Dialog } from '../../../shared/ui/Overlay';
import { showToast } from '../../../shared/ui/Toast';

// REQ-FRIEND-03 (v1.9, CR-25 #9): the one block confirmation for every place a person can be
// blocked (S-DM-04 `block-confirm`, S-DM-01 `close-dm`, S-DM-02 `not-friend`, S-HOME-10 `menu`).
export function BlockDialog({
  user,
  onDone,
  onDismiss,
}: {
  user: { id: string; name: string } | null;
  onDone?: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const name = user?.name ?? '';
  const block = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await friendActions.block(user.id);
      onDone?.();
    } catch {
      showToast({ message: t('friends.addSheet.errors.generic') });
    } finally {
      setBusy(false);
      onDismiss();
    }
  };
  return (
    <Dialog
      visible={!!user}
      title={t('friends.block.title', { name })}
      body={t('friends.block.body', { name })}
      row
      cancel={{ label: t('friends.block.cancel'), onPress: onDismiss }}
      confirm={{
        label: t('friends.block.confirm'),
        variant: 'danger',
        loading: busy,
        onPress: block,
      }}
      onDismiss={onDismiss}
    />
  );
}
