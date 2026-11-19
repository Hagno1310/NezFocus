import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { homeStore } from '../../../domain/servers/homeStore';
import { ChannelHeader } from '../../../shared/ui/Chat';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { ChatView } from '../components/ChatView';
import { useCanSend } from '../hooks/useCanSend';

// S-HOME-01: ≡ and 👥 are the non-gesture way to the drawers (SRS 3.1); no 🔍 at MVP.
export function ChannelScreen({
  channelId,
  serverId,
  onOpenLeft,
  onOpenRight,
}: {
  channelId: string;
  serverId: string;
  onOpenLeft: () => void;
  onOpenRight: () => void;
}) {
  const { t } = useTranslation();
  const name = useStore(
    homeStore,
    (s) => s.channels[serverId]?.find((c) => c.id === channelId)?.name ?? '',
  );
  const serverName = useStore(
    homeStore,
    (s) => s.servers?.find((x) => x.id === serverId)?.name,
  );
  const canSend = useCanSend(serverId, channelId);
  return (
    <ChatView
      // A new channel starts a new list, scroll position and all.
      key={channelId}
      channelId={channelId}
      serverId={serverId}
      channelName={name}
      placeholder={t('chat.composerPlaceholder', { name })}
      header={
        <ChannelHeader
          title={name}
          subtitle={serverName}
          onMenu={onOpenLeft}
          onMembers={onOpenRight}
        />
      }
      belowHeader={<ConnectionBanner />}
      disabled={canSend ? undefined : { icon: Lock, text: t('chat.forbidden') }}
    />
  );
}
