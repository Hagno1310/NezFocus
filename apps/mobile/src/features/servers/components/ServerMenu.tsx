import { Flag, LogOut, Plus, Settings, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { MenuRow } from '../../../domain/servers/serverAccess';
import { ActionSheet, type ActionItem } from '../../../shared/ui/Overlay';
import { useServerAccess } from '../hooks/useServerAccess';

export type ServerMenuActions = Record<MenuRow, () => void>;

const ICONS = {
  invite: UserPlus,
  createChannel: Plus,
  settings: Settings,
  report: Flag,
  leave: LogOut,
};

// S-HOME-09 `owner` / `member`: only the rows the caller may use (Q17).
// ponytail: the reports badge on "Cài đặt server" comes with P3-A5 (#25).
export function ServerMenu({
  serverId,
  visible,
  actions,
  onDismiss,
}: {
  serverId: string | null;
  visible: boolean;
  actions: ServerMenuActions;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const access = useServerAccess(serverId);
  if (!access) return null;
  const { server, menuRows } = access;
  const items: ActionItem[] = menuRows.map((row) => ({
    label: t(`servers.menu.${row}`),
    icon: ICONS[row],
    destructive: row === 'leave',
    onPress: () => {
      onDismiss();
      actions[row]();
    },
  }));
  return (
    <ActionSheet
      visible={visible}
      title={server.name}
      subtitle={
        server.template === 'study_server'
          ? t('servers.drawer.subtitleStudy', { count: server.member_count })
          : t('servers.drawer.subtitle', { count: server.member_count })
      }
      groups={[{ items }]}
      cancel={false}
      onDismiss={onDismiss}
    />
  );
}
