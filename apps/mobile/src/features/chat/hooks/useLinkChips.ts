import { Hash, Lock, MessageSquare, Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { dmStore } from '../../../domain/dm/dmStore';
import type { NezfocusLink } from '../../../domain/messages/links';
import { homeStore } from '../../../domain/servers/homeStore';
import type { LinkChip, LinkView } from '../../../shared/ui/MessageText';
import { openMessageLink } from '../openMessageLink';

// 02 Edge case "Chip link tên dài": the server name gives way first, "› Tin nhắn" never.
// ponytail: cut by characters; khi cần đúng 80 px: đo chữ (onTextLayout) rồi cắt.
const SERVER_MAX = 24;
const short = (name: string) =>
  name.length > SERVER_MAX ? `${name.slice(0, SERVER_MAX - 1)}…` : name;

// S-HOME-01 `nezfocus-links` (CR-19 #11): chips named from what this device knows; a server
// I am not in, a channel I cannot see or an unknown DM: "Không xem được" (chốt 26/11/2026).
export function useLinkChips(serverId: string | null): LinkView {
  const { t } = useTranslation();
  const servers = useStore(homeStore, (s) => s.servers);
  const channels = useStore(homeStore, (s) => s.channels);
  const dms = useStore(dmStore, (s) => s.byId);

  const chip = (link: NezfocusLink): LinkChip => {
    const message = link.messageId ? ` › ${t('chat.linkMessage')}` : '';
    const locked = { label: t('chat.linkLocked'), icon: Lock, locked: true };
    if (link.kind === 'dm') {
      const dm = dms[link.channelId];
      if (!dm) return locked;
      const name = dm.recipient.display_name ?? dm.recipient.username ?? '';
      return {
        label: t('chat.linkDm', { name }),
        icon: MessageSquare,
        locked: false,
      };
    }
    const server = servers?.find((s) => s.id === link.serverId);
    if (!server) return locked;
    const list = channels[link.serverId];
    const channel = list?.find((c) => c.id === link.channelId);
    // Channels of that server not loaded yet: still openable, named by the server only.
    if (!channel && list) return locked;
    const where = channel
      ? channel.type === 'voice'
        ? channel.name
        : `#${channel.name}`
      : '';
    const prefix = link.serverId === serverId ? '' : short(server.name);
    return {
      label: [prefix, where].filter(Boolean).join(' › ') + message,
      icon: link.messageId
        ? MessageSquare
        : channel?.type === 'voice'
          ? Volume2
          : Hash,
      locked: false,
    };
  };

  return {
    chip,
    // A locked chip: the Toast of openMessageLink, no screen change.
    onPress: (link) => void openMessageLink(link),
  };
}
