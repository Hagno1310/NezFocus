import { CommonActions, type NavigationState } from '@react-navigation/native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  dismissRemoval,
  removalCleared,
  removalStore,
} from '../../../domain/servers/removal';
import { Dialog } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { dropPendingToasts } from '../../../shared/ui/Toast';
import { minutesText } from '../../study/format';

type Nav = {
  getState: () => NavigationState | undefined;
  dispatch: (
    action: ReturnType<typeof CommonActions.reset> & { target?: string },
  ) => void;
};

// Spec 08 › Edge case P2: every S-SET-* screen (and the like) of that server closes at once.
function closeServerScreens(nav: Nav, serverId: string) {
  const main = nav.getState()?.routes.find((r) => r.name === 'Main')?.state;
  const home = main?.routes.find((r) => r.name === 'Home')?.state;
  if (!home?.key) return;
  const of = (r: { params?: object }) =>
    (r.params as { serverId?: string } | undefined)?.serverId === serverId;
  if (!home.routes.some(of)) return;
  const routes = home.routes.filter((r, i) => i === 0 || !of(r));
  nav.dispatch({
    ...CommonActions.reset({
      ...(home as NavigationState),
      routes: routes as NavigationState['routes'],
      index: routes.length - 1,
    }),
    target: home.key,
  });
}

// 02 S-HOME-EDGE `kicked` / `banned` / `banned-in-room`, a server deleted by its Owner (03
// S-ROOM-EDGE `kicked` uses the same, chốt 28/11/2026): the background changes first, then this Dialog, one "Đã hiểu".
export function RemovalHost({ nav }: { nav: Nav }) {
  const { t } = useTranslation();
  const shown = useStore(removalStore, (s) => s.shown);
  useEffect(
    () =>
      removalStore.subscribe((s, prev) => {
        if (!s.pending || s.pending === prev.pending) return;
        closeServerScreens(nav, s.pending.serverId);
        removalCleared();
      }),
    [nav],
  );
  const close = () => {
    dropPendingToasts();
    dismissRemoval();
  };
  // SRV-05 AC4 "Server bị Owner xóa khi đang xem": the same Dialog, its own words.
  const words =
    shown?.action === 'kick'
      ? (['servers.removed.kickedTitle', 'servers.removed.kickedBody'] as const)
      : shown?.action === 'deleted'
        ? ([
            'servers.removed.deletedTitle',
            'servers.removed.deletedBody',
          ] as const)
        : ([
            'servers.removed.bannedTitle',
            'servers.removed.bannedBody',
          ] as const);
  return (
    <Dialog
      visible={!!shown}
      title={t(words[0], { server: shown?.serverName ?? '' })}
      body={t(words[1])}
      confirm={{ label: t('servers.removed.ok'), onPress: close }}
      onDismiss={close}
    >
      {shown?.reason && (
        <Text variant="label" color="text-secondary">
          {t('servers.removed.reason', { reason: shown.reason })}
        </Text>
      )}
      {shown?.minutes != null && (
        <Text color="text-secondary">
          {t('servers.removed.minutes', {
            duration: minutesText(t, shown.minutes),
          })}
        </Text>
      )}
    </Dialog>
  );
}
