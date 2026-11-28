import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';
import { Dialog } from '../../../shared/ui/Overlay';
import { showToast } from '../../../shared/ui/Toast';
import { useMyRoomLine } from '../hooks/useMyRoomLine';
import { useServerLifecycle } from '../hooks/useServerLifecycle';

const leaveStore = createStore<{ serverId: string | null }>(() => ({
  serverId: null,
}));

// 02 S-HOME-09 "Rời server"; also right after a transfer started from `owner-leave` (A3).
export const askToLeave = (serverId: string | null) =>
  leaveStore.setState({ serverId });

// 02 S-HOME-09 `owner-leave` (the app stops the Owner first, no 40012) and `leave-confirm`,
// `leave-confirm-in-room`, `leave-confirm-host` (SRV-05 AC3, AC5; CR-17 #9): no second
// question, no "Đã rời …" Toast; the room goes with the server.
export function LeaveServerDialogs({
  onTransfer,
}: {
  onTransfer: (serverId: string) => void; // 08 S-SET-08, then back to `leave-confirm`
}) {
  const { t } = useTranslation();
  const serverId = useStore(leaveStore, (s) => s.serverId);
  const server = useStore(homeStore, (s) =>
    s.servers?.find((x) => x.id === serverId),
  );
  const meId = useStore(sessionStore, (s) => s.user?.id);
  const room = useMyRoomLine();
  const { leave } = useServerLifecycle();
  const [busy, setBusy] = useState(false);
  const close = () => askToLeave(null);
  if (!server) return null;

  if (server.owner_id === meId)
    return (
      <Dialog
        visible
        stacked
        title={t('servers.leave.ownerTitle', { server: server.name })}
        body={t('servers.leave.ownerBody')}
        confirm={{
          label: t('servers.leave.transfer'),
          variant: 'primary',
          onPress: () => {
            close();
            onTransfer(server.id);
          },
        }}
        cancel={{ label: t('servers.leave.later'), onPress: close }}
        onDismiss={close}
      />
    );

  const here = room?.serverId === server.id ? room : null;
  const body = [
    t('servers.leave.body'),
    here && t('servers.leave.inRoom', { room: here.room }),
    here?.successor !== undefined &&
      (here.successor
        ? t('servers.leave.successor', { name: here.successor })
        : t('servers.leave.noSuccessor')),
  ]
    .filter(Boolean)
    .join(' ');
  const confirm = async () => {
    setBusy(true);
    try {
      await leave(server.id);
      close();
    } catch {
      showToast({ message: t('servers.leave.failed') });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      visible
      row
      title={t('servers.leave.title', { server: server.name })}
      body={body}
      confirm={{
        label: t('servers.leave.confirm'),
        variant: 'danger',
        loading: busy,
        onPress: () => void confirm(),
      }}
      cancel={{ label: t('ui.cancel'), onPress: close }}
      onDismiss={close}
    />
  );
}
