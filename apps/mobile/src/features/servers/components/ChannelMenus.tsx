import { categoryTitle, type ChannelResponse } from '@nezfocus/shared';
import {
  ArrowUpDown,
  Folder,
  Pencil,
  Settings,
  Shield,
  Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ChannelMenuRow } from '../../../domain/servers/serverAccess';
import { ActionSheet, type ActionItem } from '../../../shared/ui/Overlay';
import { channelIcon } from './ChannelRow';

// 08 S-HOME-02 `channel-menu`: the channel, then "Cài đặt kênh" · "Sắp xếp kênh" as allowed.
export function ChannelMenu({
  visible,
  channel,
  rows,
  onSettings,
  onReorder,
  onDismiss,
}: {
  visible: boolean;
  channel: ChannelResponse | null; // kept after closing so the sheet can animate out
  rows: ChannelMenuRow[];
  onSettings: (channel: ChannelResponse) => void;
  onReorder: (channel: ChannelResponse) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!channel) return null;
  const item = (
    row: ChannelMenuRow,
    icon: ActionItem['icon'],
    go: (c: ChannelResponse) => void,
  ): ActionItem[] =>
    rows.includes(row)
      ? [
          {
            label: t(`servers.channels.${row}`),
            icon,
            onPress: () => {
              onDismiss();
              go(channel);
            },
          },
        ]
      : [];
  // Spec 08 › channel-menu: "Phòng học" under a Study Room; nothing for other channels.
  const kind =
    channel.type === 'voice' && channel.focus_control !== 'off'
      ? t('servers.channels.kindStudy')
      : undefined;
  return (
    <ActionSheet
      visible={visible}
      icon={channelIcon(channel)}
      title={channel.name}
      subtitle={kind}
      groups={[
        {
          items: [
            ...item('settings', Settings, onSettings),
            ...item('reorder', ArrowUpDown, onReorder),
          ],
        },
      ]}
      cancel={false}
      onDismiss={onDismiss}
    />
  );
}

export type CategoryMenuAction = 'rename' | 'permissions' | 'delete';

// 02 S-HOME-02 `category-menu` (MANAGE_CHANNELS): no separate "Cài đặt danh mục" screen.
export function CategoryMenu({
  visible,
  category,
  count,
  onPick,
  onDismiss,
}: {
  visible: boolean;
  category: ChannelResponse | null;
  count: number;
  onPick: (action: CategoryMenuAction, category: ChannelResponse) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!category) return null;
  const item = (
    action: CategoryMenuAction,
    label: 'categoryRename' | 'categoryPermissions' | 'categoryDelete',
    icon: ActionItem['icon'],
  ): ActionItem => ({
    label: t(`servers.channels.${label}`),
    icon,
    destructive: action === 'delete',
    onPress: () => {
      onDismiss();
      onPick(action, category);
    },
  });
  return (
    <ActionSheet
      visible={visible}
      icon={Folder}
      title={categoryTitle(category.name)}
      subtitle={t('servers.channels.categoryKind', { count })}
      groups={[
        {
          items: [
            item('rename', 'categoryRename', Pencil),
            item('permissions', 'categoryPermissions', Shield),
            item('delete', 'categoryDelete', Trash2),
          ],
        },
      ]}
      cancel={false}
      onDismiss={onDismiss}
    />
  );
}
