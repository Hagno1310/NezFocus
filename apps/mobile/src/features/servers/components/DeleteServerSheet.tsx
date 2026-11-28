import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServerSummary } from '@nezfocus/shared';
import { TypeNameSheet } from '../../../shared/ui/TypeNameSheet';
import { showToast } from '../../../shared/ui/Toast';
import { useServerLifecycle } from '../hooks/useServerLifecycle';

// 08 S-SET-08 `delete-confirm` → `deleted` (SRV-05 AC4): 10 S-MOD-03 `type-name`; done → the
// server leaves the rail, its screens close, the next server opens, then the Toast.
export function DeleteServerSheet({
  server,
  visible,
  onDismiss,
}: {
  server: ServerSummary;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const { remove } = useServerLifecycle();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await remove(server.id);
      onDismiss();
      showToast({
        message: t('servers.deleteServer.done', { server: server.name }),
        icon: Trash2,
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <TypeNameSheet
      visible={visible}
      title={t('servers.deleteServer.title', { server: server.name })}
      body={t('servers.deleteServer.body', { count: server.member_count })}
      label={t('servers.deleteServer.label')}
      name={server.name}
      confirmLabel={t('servers.deleteServer.confirm')}
      submitting={busy}
      error={failed ? t('confirm.failed') : null}
      onConfirm={() => void confirm()}
      onDismiss={() => {
        setFailed(false);
        onDismiss();
      }}
    />
  );
}
