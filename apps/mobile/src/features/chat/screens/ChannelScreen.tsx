import { Lock, Timer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { untilText } from '../../../domain/servers/members';
import { homeStore } from '../../../domain/servers/homeStore';
import { ChannelHeader } from '../../../shared/ui/Chat';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { TypingLine } from '../../typing/components/TypingLine';
import { ChatView } from '../components/ChatView';
import { useMyTimeout } from '../../servers/hooks/useMyTimeout';
import { useCanSend } from '../hooks/useCanSend';
import { useChatClock } from '../hooks/useChatClock';

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
  const timeout = useMyTimeout(serverId);
  const { now, timeZone } = useChatClock();
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
      aboveComposer={<TypingLine channelId={channelId} />}
      // S-HOME-01 `timed-out` (ROLE-05, 40307) before `forbidden`; the draft stays.
      disabled={
        timeout
          ? {
              icon: Timer,
              text: t('chat.timedOut', {
                until: untilText(timeout, now, timeZone),
              }),
            }
          : canSend
            ? undefined
            : { icon: Lock, text: t('chat.forbidden') }
      }
    />
  );
}
