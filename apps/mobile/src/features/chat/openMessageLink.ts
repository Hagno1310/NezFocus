import {
  CircleAlert,
  Lock,
  MessageSquareX,
  WifiOff,
} from 'lucide-react-native';
import { messageStore } from '../../data/messages';
import { showDm, dmStore } from '../../domain/dm/dmStore';
import { actionFailure } from '../../domain/messages/actionFailure';
import { requestJump } from '../../domain/messages/jumps';
import type { NezfocusLink } from '../../domain/messages/links';
import { homeStore, openChannel } from '../../domain/servers/homeStore';
import { openVoice } from '../../domain/voice/voiceView';
import { i18n } from '../../shared/i18n';
import { showToast } from '../../shared/ui/Toast';

export type OpenResult = 'opened' | 'not-member' | 'failed';

// REQ-MSG-05 CR-19 (AC8, AC9), REQ-NOTIF-02 AC3: opens a channel / DM link on the Home tab and,
// for a message, brings it into view with `highlight`. Push (P3-B5.3 #154) calls this too.
// `fromOutside` (App Link): a server I am not in is S-MOD-01 `members-only`, not a Toast.
export async function openMessageLink(
  link: NezfocusLink,
  { fromOutside = false }: { fromOutside?: boolean } = {},
): Promise<OpenResult> {
  const t = i18n.t.bind(i18n);
  const cannotView = () => {
    showToast({
      icon: Lock,
      message: t(
        link.messageId ? 'chat.cannotViewMessage' : 'chat.cannotViewChannel',
      ),
    });
    return 'failed' as const;
  };
  if (link.kind === 'channel') {
    const member = homeStore
      .getState()
      .servers?.some((s) => s.id === link.serverId);
    if (!member) return fromOutside ? 'not-member' : cannotView();
    // A link to a voice channel itself opens the room preview (S-ROOM-01 `not-joined`).
    const channel = homeStore
      .getState()
      .channels[link.serverId]?.find((c) => c.id === link.channelId);
    if (channel?.type === 'voice' && !link.messageId) {
      openVoice({ serverId: link.serverId, channelId: link.channelId });
      return 'opened';
    }
  } else if (!dmStore.getState().byId[link.channelId]) return cannotView();

  let exists = true;
  try {
    exists = await messageStore.peek(link.channelId, link.messageId);
  } catch (err) {
    // 40401 for a channel I cannot view and for one that is gone: nothing says which (AC8).
    const failure = actionFailure(err);
    if (failure.kind === 'deleted') return cannotView();
    showToast(
      failure.kind === 'offline'
        ? { icon: WifiOff, message: t('chat.cannotConnect') }
        : { icon: CircleAlert, message: t('chat.somethingWrong') },
    );
    return 'failed';
  }
  if (link.kind === 'channel')
    openChannel({ serverId: link.serverId, channelId: link.channelId });
  else showDm(link.channelId);
  if (!link.messageId) return 'opened';
  if (exists)
    requestJump({
      channelId: link.channelId,
      messageId: link.messageId,
      times: 2,
    });
  // AC9: the channel opens as if tapped, and says the message is gone.
  else showToast({ icon: MessageSquareX, message: t('chat.messageDeleted') });
  return 'opened';
}
