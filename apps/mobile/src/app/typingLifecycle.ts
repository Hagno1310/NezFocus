import { gatewayClient } from '../data/gateway';
import { typingRepository } from '../data/typing';
import { gatewayStore, onGatewayEvent } from '../domain/gateway/gatewayStore';
import { drafts } from '../domain/messages/drafts';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';
import { createTypingSender, typingStore } from '../domain/typing/typing';

// REQ-MSG-06 / MSG-07: SUBSCRIBE the server of the open channel, POST typing as the draft
// changes, and keep typingStore in step with TYPING_START / MESSAGE_CREATE.
export function startTypingLifecycle() {
  const stopEvents = onGatewayEvent((event) => {
    if (event.t === 'TYPING_START') typingStore.started(event.d);
    if (event.t === 'MESSAGE_CREATE')
      typingStore.messageCreated(event.d.channel_id, event.d.author.id);
  });

  const subscribe = () =>
    gatewayClient.subscribe(homeStore.getState().open?.serverId ?? null);
  subscribe();
  const stopHome = homeStore.subscribe(subscribe);

  const onDraft = createTypingSender({
    post: typingRepository.start,
    online: () => gatewayStore.getState().online,
    now: Date.now,
  });
  const stopDrafts = drafts.state.subscribe((s, prev) => {
    for (const channelId of Object.keys(s))
      onDraft(channelId, s[channelId]!, prev[channelId] ?? '');
  });

  const stopSession = sessionStore.subscribe((s, prev) => {
    if (prev.status === 'signed-in' && s.status !== 'signed-in')
      typingStore.reset();
  });

  return () => {
    stopEvents();
    stopHome();
    stopDrafts();
    stopSession();
  };
}
