import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deletionDay } from '../../../domain/account/deletion';
import type { SignInMode } from '../../../domain/auth/authFlow';
import { Dialog } from '../../../shared/ui/Overlay';
import { useAuthFlow } from '../authFlowStore';
import {
  showErrorToast,
  useLaterRestore,
  useRestoreAccount,
} from '../hooks/useAuthActions';

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// 01 S-AUTH-04 `pending-deletion` (REQ-AUTH-10 AC4), over S-AUTH-04 or S-AUTH-03: two buttons
// stacked full width, no mascot. "Để sau" → S-AUTH-04 in the way the user came, email kept.
export function PendingDeletionDialog({
  onLater,
}: {
  onLater: (mode: SignInMode, email: string) => void;
}) {
  const { t } = useTranslation();
  const pending = useAuthFlow((s) => s.pendingDeletion);
  const restore = useRestoreAccount();
  const later = useLaterRestore();
  const [now] = useState(() => Date.now());
  if (!pending) return null;
  const { date, days } = deletionDay(pending.deletesAt, now, zone());
  return (
    <Dialog
      visible
      stacked
      title={t('auth.pendingDeletion.title')}
      body={t('auth.pendingDeletion.body', { date, count: days })}
      confirm={{
        label: t('auth.pendingDeletion.restore'),
        loading: restore.pending,
        disabled: later.pending,
        onPress: () =>
          void restore.run().catch(() => showErrorToast('network')),
      }}
      cancel={{
        label: t('auth.pendingDeletion.later'),
        onPress: () => {
          const { method, user } = pending;
          void later.run().then(() => onLater(method, user.email));
        },
      }}
      onDismiss={() => {}}
    />
  );
}
