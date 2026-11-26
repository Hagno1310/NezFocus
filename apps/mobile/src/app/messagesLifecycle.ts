import { wipeLocalDb } from '../data/db';
import { messageStore } from '../data/messages';
import { gatewayStore, onGatewayEvent } from '../domain/gateway/gatewayStore';
import { drafts } from '../domain/messages/drafts';
import { sessionStore } from '../domain/session/sessionStore';

const quietly = (p: Promise<unknown>) => void p.catch(() => {});

// SRS 7.3.2 / 8.4.5: keeps the message cache and outbox in step with Gateway, network, session.
// Flushing from the background (react-native-background-fetch) is v1.x: SRS › Outbox, CR-28.
export function startMessagesLifecycle() {
  const stopEvents = onGatewayEvent((event) => {
    if (event.t === 'MESSAGE_CREATE')
      quietly(messageStore.applyCreate(event.d));
    // REQ-MSG-05
    if (event.t === 'MESSAGE_UPDATE')
      quietly(messageStore.applyUpdate(event.d));
    if (event.t === 'MESSAGE_DELETE')
      quietly(messageStore.applyDelete(event.d));
    if (
      event.t === 'MESSAGE_REACTION_ADD' ||
      event.t === 'MESSAGE_REACTION_REMOVE'
    )
      quietly(
        messageStore.applyReaction(
          event.d,
          event.t === 'MESSAGE_REACTION_ADD' ? 'add' : 'remove',
          sessionStore.getState().user?.id ?? '',
        ),
      );
    // REQ-MSG-10 AC1: the cached message knows whether it is pinned (sheet row).
    if (event.t === 'CHANNEL_PINS_UPDATE')
      quietly(messageStore.applyPins(event.d));
    // RESUMED, or READY again after INVALID_SESSION: what the open channels missed.
    if (event.t === 'READY' || event.t === 'RESUMED')
      quietly(messageStore.catchUp());
  });

  // Network back or app back in front: the outbox goes at once, in order (NFR-MOB-09).
  const stopNetwork = gatewayStore.subscribe((s, prev) => {
    if ((s.online && !prev.online) || (s.foreground && !prev.foreground))
      quietly(messageStore.flush({ now: true }));
  });

  const stopSession = sessionStore.subscribe((s, prev) => {
    // Killed with messages pending: they go as soon as the user is back.
    if (s.status === 'signed-in' && prev.status !== 'signed-in')
      quietly(messageStore.flush());
    // AUTH-07, also when the session ended (19/11/2026): the local DB file goes.
    if (s.status === 'signed-out' && prev.status !== 'signed-out') {
      messageStore.reset();
      drafts.reset();
      quietly(wipeLocalDb());
    }
  });

  return () => {
    stopEvents();
    stopNetwork();
    stopSession();
  };
}
