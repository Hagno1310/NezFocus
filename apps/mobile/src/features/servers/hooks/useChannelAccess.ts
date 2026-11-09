import type { ChannelResponse } from '@nezfocus/shared';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { homeStore, isOwnDelete } from '../../../domain/servers/homeStore';
import {
  channelSettingsRows,
  type ChannelSettingsRow,
} from '../../../domain/servers/serverAccess';
import { showToast } from '../../../shared/ui/Toast';
import { useServerAccess } from './useServerAccess';

// S-SET-06 and its Tổng quan: the channel as the drawer knows it, the rows the caller may
// see, and the two Edge case rules (spec 08 › Edge case S-SET-07 & S-SET-06): someone else
// deletes the channel → back to the drawer, "Kênh này đã bị xóa"; the caller loses the
// permission (or a save answers 40302) → "Bạn không còn quyền chỉnh kênh này".
export function useChannelAccess(
  serverId: string,
  channelId: string,
  needs: ChannelSettingsRow | 'any',
  onClose: () => void,
): {
  channel: ChannelResponse;
  rows: ChannelSettingsRow[];
  isWelcome: boolean;
  lostAccess: () => void;
} | null {
  const { t } = useTranslation();
  const access = useServerAccess(serverId);
  const channel = useStore(homeStore, (s) =>
    s.channels[serverId]?.find((c) => c.id === channelId),
  );
  const listed = useStore(homeStore, (s) => s.channels[serverId] !== undefined);
  const [seen, setSeen] = useState(false);
  if (channel && !seen) setSeen(true);

  const rows =
    access && channel && channel.type !== 'category'
      ? channelSettingsRows(access.channelPerms(channel), channel.type)
      : [];
  // The list is refetched after a reconnect; wait for it instead of closing on the gap.
  const deleted = seen && listed && !channel;
  const allowed = needs === 'any' ? rows.length > 0 : rows.includes(needs);
  const lost =
    !deleted && !!access && access.roles !== undefined && listed && !allowed;

  const leave = (why: 'deleted' | 'lost') => {
    if (why === 'deleted' && isOwnDelete(channelId)) return onClose();
    showToast({
      message:
        why === 'deleted'
          ? t('servers.channels.channelDeleted')
          : t('servers.channels.lostAccess'),
    });
    onClose();
  };
  const close = useEffectEvent(leave);
  useEffect(() => {
    if (deleted) close('deleted');
    else if (lost) close('lost');
  }, [deleted, lost]);

  if (!access || !channel) return null;
  return {
    channel,
    rows,
    isWelcome: access.server.system_channel_id === channel.id,
    lostAccess: () => leave('lost'),
  };
}
